// Záloha dat do složky v počítači – tlačítko „Zálohovat" v adminu.
//
// Proč: bezplatný tarif Supabase nemá automatické zálohy. Tlačítko stáhne
// obsah všech tabulek do souboru data.json a všechny obrázky z úložiště.
// Běží v prohlížeči pod přihlášeným adminem, takže nepotřebuje tajný klíč.
// Ukládání do složky umí jen Chrome a Edge (File System Access API).
//
// Co v záloze není: struktura databáze a pravidla přístupu (ta jsou v .sql
// souborech v repu) a přihlašovací účet admina.

const BACKUP_NAME = 'vedci';
const BACKUP_TABLES = ['articles', 'glosas', 'pages', 'newsletter_subscribers', 'newsletter_emails'];
const BACKUP_BUCKET = 'article-images';

const Backup = {
    // Všechny řádky tabulky, po tisíci
    async fetchAllRows(table) {
        const rows = [];
        const pageSize = 1000;
        for (let from = 0; ; from += pageSize) {
            const { data, error } = await supabaseClient.from(table).select('*').range(from, from + pageSize - 1);
            if (error) throw error;
            rows.push(...data);
            if (data.length < pageSize) break;
        }
        return rows;
    },

    // Cesty všech souborů v bucketu včetně podsložek
    async listAllFiles(folder = '') {
        const paths = [];
        const pageSize = 1000;
        for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await supabaseClient.storage.from(BACKUP_BUCKET)
                .list(folder, { limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } });
            if (error) throw error;
            for (const item of data) {
                const path = folder ? `${folder}/${item.name}` : item.name;
                if (!item.id) {
                    paths.push(...await this.listAllFiles(path)); // složka
                } else if (!item.name.startsWith('.')) {
                    paths.push(path);
                }
            }
            if (data.length < pageSize) break;
        }
        return paths;
    },

    async writeFile(directory, name, content) {
        const handle = await directory.getFileHandle(name, { create: true });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
    },

    // Složka pro soubor s cestou typu „articles/obrazek.webp"
    async directoryFor(root, path) {
        let directory = root;
        for (const part of path.split('/').slice(0, -1)) {
            directory = await directory.getDirectoryHandle(part, { create: true });
        }
        return directory;
    }
};

function setBackupStatus(message) {
    const status = document.getElementById('image-tools-status');
    if (status) status.textContent = message;
}

async function handleBackup() {
    if (!window.showDirectoryPicker) {
        alert('Zálohu do složky umí jen Chrome a Edge. Otevři admin v jednom z nich.');
        return;
    }

    // Bez přihlášení by záloha obsahovala jen veřejná data a tvářila se jako úplná
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        alert('Nejsi přihlášený. Přihlas se prosím znovu.');
        return;
    }

    let parent;
    try {
        parent = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (error) {
        return; // výběr složky zrušen
    }

    const button = document.getElementById('backup-data');
    button.disabled = true;

    try {
        const today = new Date().toISOString().slice(0, 10);
        const folderName = `zaloha-${BACKUP_NAME}-${today}`;
        const root = await parent.getDirectoryHandle(folderName, { create: true });

        // 1) Tabulky
        const tables = {};
        const counts = [];
        for (const table of BACKUP_TABLES) {
            setBackupStatus(`Zálohuji tabulku ${table}…`);
            tables[table] = await Backup.fetchAllRows(table);
            counts.push(`${table}: ${tables[table].length}`);
        }
        const backup = { project: BACKUP_NAME, created_at: new Date().toISOString(), tables };
        await Backup.writeFile(root, 'data.json', JSON.stringify(backup, null, 2));

        // 2) Obrázky
        setBackupStatus('Hledám obrázky v úložišti…');
        const paths = await Backup.listAllFiles();
        const imagesRoot = await root.getDirectoryHandle('obrazky', { create: true });
        const failed = [];
        for (let i = 0; i < paths.length; i++) {
            setBackupStatus(`Stahuji obrázek ${i + 1} z ${paths.length}…`);
            const { data, error } = await supabaseClient.storage.from(BACKUP_BUCKET).download(paths[i]);
            if (error) {
                failed.push(paths[i]);
                continue;
            }
            const directory = await Backup.directoryFor(imagesRoot, paths[i]);
            await Backup.writeFile(directory, paths[i].split('/').pop(), data);
        }

        let summary = `Záloha je ve složce ${folderName}. Řádků – ${counts.join(', ')}. Obrázků: ${paths.length - failed.length}.`;
        if (failed.length) {
            summary += ` Nepodařilo se stáhnout ${failed.length}: ${failed.slice(0, 5).join(', ')}`;
        }
        setBackupStatus(summary);
    } catch (error) {
        console.error('Záloha selhala:', error);
        setBackupStatus('Záloha se nepodařila: ' + error.message);
    } finally {
        button.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('backup-data')?.addEventListener('click', handleBackup);
});
