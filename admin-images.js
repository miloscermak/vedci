// Zmenšování obrázků článků přímo v prohlížeči admina.
//
// Proč: obrázky z AI jsou PNG po zhruba 2 MB. Převod na WebP je zmenší asi
// desetkrát, což šetří úložiště i přenos dat v Supabase (limity bezplatného
// tarifu). Převod běží v prohlížeči přes <canvas>, takže není potřeba žádná
// knihovna ani tajný klíč – stačí být přihlášený v adminu.
//
// Soubory mají roční cache, proto se nikdy nepřepisují pod stejným názvem:
// zmenšená verze dostane nový název (.webp) a článek se na ni přepne.

const IMAGE_BUCKET = 'article-images';
const IMAGE_FOLDER = 'articles';
const IMAGE_MAX_WIDTH = 1400;
const IMAGE_QUALITY = 0.82;
const IMAGE_CACHE_SECONDS = '31536000'; // rok
const CLEANUP_MIN_AGE_MS = 60 * 60 * 1000; // čerstvé soubory nemažeme – může právě běžet AI generování

const ImageOptimizer = {
    // Cesta souboru v bucketu z veřejné URL; null u obrázků, které nejsou v našem úložišti
    pathFromUrl(url) {
        const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
        const index = (url || '').indexOf(marker);
        if (index === -1) return null;
        return decodeURIComponent(url.slice(index + marker.length).split('?')[0]);
    },

    publicUrl(path) {
        return supabaseClient.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
    },

    needsOptimizing(url) {
        const path = this.pathFromUrl(url);
        return Boolean(path) && !/\.webp$/i.test(path);
    },

    formatMb(bytes) {
        return (bytes / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
    },

    // Převod libovolného obrázku (Blob/File) na zmenšený WebP
    async toWebp(blob) {
        const bitmap = await createImageBitmap(blob);
        const scale = Math.min(1, IMAGE_MAX_WIDTH / bitmap.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);

        const context = canvas.getContext('2d');
        context.imageSmoothingQuality = 'high';
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();

        const webp = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', IMAGE_QUALITY));
        // Prohlížeč bez podpory WebP by potichu vrátil PNG – to nechceme
        if (!webp || webp.type !== 'image/webp') {
            throw new Error('Tento prohlížeč neumí ukládat WebP. Použij Chrome, Edge nebo Firefox.');
        }
        return webp;
    },

    // Příprava ručně nahrávaného souboru: WebP, pokud je menší; jinak originál
    async prepareUpload(file) {
        try {
            const webp = await this.toWebp(file);
            if (webp.size < file.size) {
                return { blob: webp, extension: 'webp' };
            }
        } catch (error) {
            console.warn('Obrázek se nepodařilo zmenšit, nahrávám originál:', error);
        }
        return { blob: file, extension: file.name.split('.').pop() };
    },

    // Převede obrázek jednoho článku a přepne článek na novou verzi.
    // Původní soubor maže jen na vyžádání (u čerstvě vygenerovaných obrázků).
    async optimizeArticle(article, { deleteOriginal = false } = {}) {
        const oldPath = this.pathFromUrl(article.image_url);
        const response = await fetch(article.image_url);
        if (!response.ok) {
            throw new Error(`Obrázek se nepodařilo stáhnout (${response.status})`);
        }

        const original = await response.blob();
        const webp = await this.toWebp(original);
        if (webp.size >= original.size) {
            return { saved: 0, skipped: true };
        }

        const newPath = oldPath.replace(/\.[^./]+$/, '') + '.webp';
        const upload = await supabaseClient.storage.from(IMAGE_BUCKET)
            .upload(newPath, webp, { cacheControl: IMAGE_CACHE_SECONDS, contentType: 'image/webp', upsert: true });
        if (upload.error) throw upload.error;

        // .select() vrátí změněné řádky – bez oprávnění by Supabase jen mlčky nic nezměnil
        const update = await supabaseClient.from('articles')
            .update({ image_url: this.publicUrl(newPath) })
            .eq('id', article.id)
            .select('id');
        if (update.error) throw update.error;
        if (!update.data || update.data.length === 0) {
            throw new Error('Článek se nepodařilo přepnout na nový obrázek');
        }

        if (deleteOriginal) {
            await supabaseClient.storage.from(IMAGE_BUCKET).remove([oldPath]);
        }
        return { saved: original.size - webp.size };
    },

    // Zmenšení čerstvě vygenerovaného obrázku. Selhání není chyba – obrázek
    // zůstane v původní podobě a později ho dožene tlačítko „Zmenšit obrázky".
    async optimizeGenerated(articleId) {
        try {
            const article = await window.articleDB.getArticleById(articleId);
            if (!article || !this.needsOptimizing(article.image_url)) return;
            await this.optimizeArticle(article, { deleteOriginal: true });
        } catch (error) {
            console.warn('Vygenerovaný obrázek se nepodařilo zmenšit:', error);
        }
    },

    // Všechny soubory ve složce s obrázky (po stránkách)
    async listAllFiles() {
        const files = [];
        const pageSize = 1000;
        for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await supabaseClient.storage.from(IMAGE_BUCKET)
                .list(IMAGE_FOLDER, { limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } });
            if (error) throw error;
            // složky mají id null, systémové soubory začínají tečkou
            files.push(...data.filter(file => file.id && !file.name.startsWith('.')));
            if (data.length < pageSize) break;
        }
        return files;
    },

    // Soubory, jejichž název se neobjevuje v žádném článku, glose ani stránce.
    // Hledá se v celém obsahu řádků, takže chrání i obrázky vložené do textu.
    async findUnusedFiles() {
        const [files, articles, glosas, pages] = await Promise.all([
            this.listAllFiles(),
            supabaseClient.from('articles').select('*'),
            supabaseClient.from('glosas').select('*'),
            supabaseClient.from('pages').select('*')
        ]);
        for (const result of [articles, glosas, pages]) {
            if (result.error) throw result.error;
        }

        const allText = JSON.stringify([articles.data, glosas.data, pages.data]);
        const now = Date.now();
        return files.filter(file =>
            !allText.includes(file.name) &&
            now - new Date(file.created_at).getTime() > CLEANUP_MIN_AGE_MS
        );
    }
};

// ===== Ovládání v záložce Články =====

function setImageToolsStatus(message) {
    const status = document.getElementById('image-tools-status');
    if (status) status.textContent = message;
}

function pendingImageArticles(articles) {
    return (articles || []).filter(article => ImageOptimizer.needsOptimizing(article.image_url));
}

// Volá se po každém načtení seznamu článků
function updateImageTools(articles) {
    const button = document.getElementById('optimize-images');
    if (!button || button.dataset.busy === 'true') return;

    const pending = pendingImageArticles(articles);
    button.textContent = pending.length ? `Zmenšit obrázky (${pending.length})` : 'Obrázky jsou zmenšené';
    button.disabled = pending.length === 0;
}

async function handleOptimizeImages() {
    const button = document.getElementById('optimize-images');
    const pending = pendingImageArticles(await window.articleDB.getAllArticlesIncludingDrafts());
    if (pending.length === 0) return;

    if (!confirm(`Převést ${pending.length} obrázků na menší formát WebP? Původní soubory zůstanou v úložišti, dokud je nesmažeš tlačítkem „Smazat nepoužívané soubory". Potrvá to několik minut, nech okno otevřené.`)) {
        return;
    }

    button.dataset.busy = 'true';
    button.disabled = true;

    let saved = 0;
    let done = 0;
    const failed = [];
    for (const article of pending) {
        setImageToolsStatus(`Zmenšuji ${done + 1} z ${pending.length}: ${article.title}`);
        try {
            const result = await ImageOptimizer.optimizeArticle(article);
            saved += result.saved;
        } catch (error) {
            console.error('Zmenšení obrázku selhalo:', article.title, error);
            failed.push(`${article.title} (${error.message})`);
        }
        done++;
    }

    button.dataset.busy = 'false';
    await loadArticleList();

    let summary = `Hotovo. Převedeno ${pending.length - failed.length} obrázků, nové verze jsou menší o ${ImageOptimizer.formatMb(saved)}.`;
    if (failed.length) {
        summary += ` Nepodařilo se ${failed.length}: ${failed.join('; ')}`;
    }
    setImageToolsStatus(summary);
}

async function handleCleanupImages() {
    const button = document.getElementById('cleanup-images');
    button.disabled = true;
    setImageToolsStatus('Hledám nepoužívané soubory…');

    try {
        const unused = await ImageOptimizer.findUnusedFiles();
        if (unused.length === 0) {
            setImageToolsStatus('V úložišti nejsou žádné nepoužívané soubory.');
            return;
        }

        const totalSize = unused.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
        if (!confirm(`V úložišti je ${unused.length} souborů (${ImageOptimizer.formatMb(totalSize)}), které nepoužívá žádný článek. Smazat je natrvalo? Tohle nejde vrátit. Ve starých rozeslaných newsletterech se tyto obrázky přestanou zobrazovat.`)) {
            setImageToolsStatus('Mazání zrušeno.');
            return;
        }

        // Mažeme po dávkách, ať jeden požadavek není obří
        const paths = unused.map(file => `${IMAGE_FOLDER}/${file.name}`);
        let deleted = 0;
        for (let i = 0; i < paths.length; i += 100) {
            const { data, error } = await supabaseClient.storage.from(IMAGE_BUCKET).remove(paths.slice(i, i + 100));
            if (error) throw error;
            deleted += (data || []).length;
        }
        // Bez oprávnění DELETE Supabase nevrátí chybu, jen nic nesmaže
        if (deleted < paths.length) {
            setImageToolsStatus(`Smazáno ${deleted} z ${paths.length} souborů. Zbytek se smazat nepodařilo – nejspíš chybí oprávnění k mazání ve Storage.`);
        } else {
            setImageToolsStatus(`Smazáno ${deleted} nepoužívaných souborů, uvolněno ${ImageOptimizer.formatMb(totalSize)}.`);
        }
    } catch (error) {
        console.error('Úklid úložiště selhal:', error);
        setImageToolsStatus('Úklid se nepodařil: ' + error.message);
    } finally {
        button.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('optimize-images')?.addEventListener('click', handleOptimizeImages);
    document.getElementById('cleanup-images')?.addEventListener('click', handleCleanupImages);
});
