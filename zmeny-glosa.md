# Implementace systému glos - Vědci zjistili

## 📋 Přehled

Tento dokument popisuje implementaci systému **glos** (redakčních komentářů) pro web Vědci zjistili. Glosa je krátký redakční text (max. 300 slov), který se zobrazuje na hlavní stránce mezi hlavním článkem a seznamem dalších článků.

## 🎯 Cíle implementace

- Přidat možnost publikovat redakční komentáře/glosy
- Zachovat jednoduchost a minimalistický design webu
- Umožnit základní formátování textu (tučné, kurzíva, odkazy)
- Jednoduché ovládání v admin rozhraní
- Flexibilita - glosa nemusí být vždy aktivní

## 🏗️ Struktura implementace

### 1. Databázové změny
### 2. Backend úpravy
### 3. Admin rozhraní
### 4. Frontend zobrazení
### 5. Testování

---

## 1. 🗄️ Databázové změny

### Krok 1.1: Vytvoření tabulky `glosas`

Spusťte následující SQL skript v Supabase:

```sql
-- Vytvoření tabulky pro glosy
CREATE TABLE glosas (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,  -- HTML obsah z Quill editoru
    content_plain TEXT,     -- Plain text verze pro počítání slov
    word_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    author VARCHAR(100) DEFAULT 'Redakce'
);

-- Index pro rychlé vyhledávání aktivní glosy
CREATE INDEX idx_glosas_active ON glosas(is_active) WHERE is_active = true;

-- Trigger pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_glosas_updated_at BEFORE UPDATE
    ON glosas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funkce pro zajištění pouze jedné aktivní glosy
CREATE OR REPLACE FUNCTION ensure_single_active_glosa()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE glosas SET is_active = false WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER ensure_single_active_glosa_trigger
    AFTER INSERT OR UPDATE ON glosas
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION ensure_single_active_glosa();
```

---

## 2. 🔧 Backend úpravy

### Krok 2.1: Přidat funkce do `database.js`

Do souboru `database.js` přidejte následující funkce:

```javascript
// ========== FUNKCE PRO GLOSY ==========

// Získat aktivní glosu
async function getActiveGlosa() {
    const { data, error } = await supabaseClient
        .from('glosas')
        .select('*')
        .eq('is_active', true)
        .single();
    
    if (error && error.code !== 'PGRST116') { // Ignorovat "no rows" error
        console.error('Error fetching active glosa:', error);
        return null;
    }
    return data;
}

// Získat všechny glosy
async function getAllGlosas() {
    const { data, error } = await supabaseClient
        .from('glosas')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching glosas:', error);
        return [];
    }
    return data || [];
}

// Vytvořit novou glosu
async function createGlosa(glosaData) {
    // Spočítat počet slov z plain text verze
    const wordCount = glosaData.content_plain ? 
        glosaData.content_plain.trim().split(/\s+/).length : 0;
    
    const { data, error } = await supabaseClient
        .from('glosas')
        .insert([{
            ...glosaData,
            word_count: wordCount
        }])
        .select()
        .single();
    
    if (error) {
        console.error('Error creating glosa:', error);
        throw error;
    }
    return data;
}

// Aktualizovat glosu
async function updateGlosa(id, updates) {
    // Pokud se aktualizuje obsah, přepočítat počet slov
    if (updates.content_plain) {
        updates.word_count = updates.content_plain.trim().split(/\s+/).length;
    }
    
    const { data, error } = await supabaseClient
        .from('glosas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating glosa:', error);
        throw error;
    }
    return data;
}

// Smazat glosu
async function deleteGlosa(id) {
    const { error } = await supabaseClient
        .from('glosas')
        .delete()
        .eq('id', id);
    
    if (error) {
        console.error('Error deleting glosa:', error);
        throw error;
    }
}

// Nastavit glosu jako aktivní
async function setActiveGlosa(id) {
    const { error } = await supabaseClient
        .from('glosas')
        .update({ is_active: true })
        .eq('id', id);
    
    if (error) {
        console.error('Error setting active glosa:', error);
        throw error;
    }
}
```

---

## 3. 👨‍💼 Admin rozhraní

### Krok 3.1: Přidat navigační tlačítko

V souboru `admin.html` najděte navigační menu a přidejte nové tlačítko:

```html
<button onclick="showSection('glosas')" class="tab-button">Glosy</button>
```

### Krok 3.2: Přidat sekci pro správu glos

Do `admin.html` přidejte novou sekci (před uzavírací `</body>` tag):

```html
<!-- Sekce pro správu glos -->
<div id="glosas-section" class="section" style="display: none;">
    <h2>Správa glos</h2>
    
    <!-- Formulář pro novou glosu -->
    <div class="glosa-form-container">
        <h3>Nová glosa</h3>
        <form id="glosa-form">
            <div class="form-group">
                <label for="glosa-title">Název glosy:</label>
                <input type="text" id="glosa-title" maxlength="255" required>
            </div>
            
            <div class="form-group">
                <label for="glosa-content">Text glosy (max. 300 slov):</label>
                <div id="glosa-editor" style="height: 250px;"></div>
                <div class="editor-toolbar">
                    <div class="word-counter">
                        Počet slov: <span id="word-count">0</span> / 300
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label for="glosa-author">Autor (nepovinné):</label>
                <input type="text" id="glosa-author" placeholder="Redakce" maxlength="100">
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" id="glosa-active">
                    Nastavit jako aktivní (zobrazit na hlavní stránce)
                </label>
            </div>
            
            <button type="submit" class="btn btn-primary">Uložit glosu</button>
        </form>
    </div>
    
    <!-- Seznam existujících glos -->
    <div class="glosas-list-container">
        <h3>Existující glosy</h3>
        <div id="glosas-list"></div>
    </div>
</div>
```

### Krok 3.3: Přidat CSS styly

Do `<style>` sekce v `admin.html` přidejte:

```css
/* Styly pro glosy */
.glosa-form-container {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 30px;
}

.editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    padding: 10px;
    background: #f0f0f0;
    border-radius: 4px;
}

.word-counter {
    font-size: 0.9em;
    color: #666;
}

.word-counter.warning {
    color: #ff9800;
    font-weight: bold;
}

.word-counter.error {
    color: #f44336;
    font-weight: bold;
}

.glosa-item {
    background: white;
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 15px;
    margin-bottom: 15px;
}

.glosa-item.active {
    border-color: #28a745;
    background: #f0fff4;
}

.glosa-item-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 10px;
}

.glosa-item-title {
    font-weight: bold;
    font-size: 1.1em;
}

.glosa-item-meta {
    display: flex;
    gap: 15px;
    color: #666;
    font-size: 0.9em;
    margin-bottom: 10px;
}

.glosa-item-content {
    color: #333;
    margin: 10px 0;
    max-height: 150px;
    overflow-y: auto;
    padding: 10px;
    background: #f9f9f9;
    border-radius: 4px;
}

.glosa-item-actions {
    display: flex;
    gap: 10px;
    margin-top: 10px;
}

.glosa-status {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 3px;
    font-size: 0.85em;
    font-weight: bold;
}

.glosa-status.active {
    background: #28a745;
    color: white;
}

.glosa-status.inactive {
    background: #6c757d;
    color: white;
}

#glosa-editor {
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.ql-toolbar {
    border-radius: 4px 4px 0 0;
}

.ql-container {
    border-radius: 0 0 4px 4px;
    font-size: 1rem;
}
```

### Krok 3.4: Přidat JavaScript funkce

Do `<script>` sekce v `admin.html` přidejte:

```javascript
// ========== SPRÁVA GLOS ==========

let glosaQuill;

// Inicializace Quill editoru pro glosy
function initGlosaEditor() {
    glosaQuill = new Quill('#glosa-editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                ['link'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean']
            ]
        },
        placeholder: 'Napište glosu... (max. 300 slov)'
    });
    
    // Počítadlo slov
    glosaQuill.on('text-change', function() {
        const text = glosaQuill.getText().trim();
        const wordCount = text ? text.split(/\s+/).length : 0;
        const counter = document.getElementById('word-count');
        counter.textContent = wordCount;
        
        // Změna barvy podle počtu slov
        const counterContainer = counter.parentElement;
        counterContainer.classList.remove('warning', 'error');
        
        if (wordCount > 300) {
            counterContainer.classList.add('error');
        } else if (wordCount > 250) {
            counterContainer.classList.add('warning');
        }
    });
}

// Načtení glos
async function loadGlosas() {
    const glosas = await getAllGlosas();
    const listElement = document.getElementById('glosas-list');
    
    if (glosas.length === 0) {
        listElement.innerHTML = '<p>Žádné glosy zatím nebyly vytvořeny.</p>';
        return;
    }
    
    listElement.innerHTML = glosas.map(glosa => `
        <div class="glosa-item ${glosa.is_active ? 'active' : ''}">
            <div class="glosa-item-header">
                <div>
                    <div class="glosa-item-title">${glosa.title}</div>
                    <div class="glosa-item-meta">
                        <span>${new Date(glosa.created_at).toLocaleDateString('cs-CZ')}</span>
                        <span>•</span>
                        <span>${glosa.word_count} slov</span>
                        <span>•</span>
                        <span>${glosa.author}</span>
                    </div>
                </div>
                <span class="glosa-status ${glosa.is_active ? 'active' : 'inactive'}">
                    ${glosa.is_active ? 'AKTIVNÍ' : 'Neaktivní'}
                </span>
            </div>
            <div class="glosa-item-content">${glosa.content}</div>
            <div class="glosa-item-actions">
                ${!glosa.is_active ? 
                    `<button onclick="activateGlosa(${glosa.id})" class="btn btn-success btn-sm">
                        Aktivovat
                    </button>` : 
                    `<button onclick="deactivateGlosa(${glosa.id})" class="btn btn-secondary btn-sm">
                        Deaktivovat
                    </button>`
                }
                <button onclick="deleteGlosaConfirm(${glosa.id})" class="btn btn-danger btn-sm">
                    Smazat
                </button>
            </div>
        </div>
    `).join('');
}

// Uložení nové glosy
document.getElementById('glosa-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const text = glosaQuill.getText().trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    
    if (wordCount > 300) {
        alert('Glosa je příliš dlouhá! Maximum je 300 slov.');
        return;
    }
    
    const glosaData = {
        title: document.getElementById('glosa-title').value,
        content: glosaQuill.root.innerHTML,
        content_plain: text,
        author: document.getElementById('glosa-author').value || 'Redakce',
        is_active: document.getElementById('glosa-active').checked
    };
    
    try {
        await createGlosa(glosaData);
        alert('Glosa byla úspěšně uložena!');
        
        // Vyčistit formulář
        document.getElementById('glosa-form').reset();
        glosaQuill.setText('');
        document.getElementById('word-count').textContent = '0';
        
        await loadGlosas();
    } catch (error) {
        alert('Chyba při ukládání glosy: ' + error.message);
    }
});

// Aktivace glosy
async function activateGlosa(id) {
    try {
        await setActiveGlosa(id);
        await loadGlosas();
        alert('Glosa byla aktivována.');
    } catch (error) {
        alert('Chyba při aktivaci glosy: ' + error.message);
    }
}

// Deaktivace glosy
async function deactivateGlosa(id) {
    try {
        await updateGlosa(id, { is_active: false });
        await loadGlosas();
        alert('Glosa byla deaktivována.');
    } catch (error) {
        alert('Chyba při deaktivaci glosy: ' + error.message);
    }
}

// Smazání glosy
async function deleteGlosaConfirm(id) {
    if (confirm('Opravdu chcete smazat tuto glosu?')) {
        try {
            await deleteGlosa(id);
            await loadGlosas();
            alert('Glosa byla smazána.');
        } catch (error) {
            alert('Chyba při mazání glosy: ' + error.message);
        }
    }
}

// Upravit showSection funkci pro inicializaci glos
const originalShowSection = showSection;
showSection = function(sectionName) {
    originalShowSection(sectionName);
    if (sectionName === 'glosas') {
        if (!glosaQuill) {
            initGlosaEditor();
        }
        loadGlosas();
    }
}
```

---

## 4. 🖥️ Frontend zobrazení

### Krok 4.1: Úprava HTML struktury v `index.html`

Najděte místo, kde zobrazujete články, a přidejte kontejner pro glosu:

```html
<div class="main-content">
    <!-- Hlavní článek -->
    <div id="featured-article"></div>
    
    <!-- Kontejner pro glosu (mezi hlavním článkem a seznamem) -->
    <div id="glosa-container" style="display: none;"></div>
    
    <!-- Seznam dalších článků -->
    <div class="recent-articles">
        <h3>Další články</h3>
        <div id="recent-articles-list" class="article-list"></div>
    </div>
    
    <div class="archive-link">
        <a href="/archiv.html">Zobrazit všechny články →</a>
    </div>
</div>
```

### Krok 4.2: Přidat CSS styly pro glosu

Do `styles.css` nebo do `<style>` sekce v `index.html`:

```css
/* Glosa Section */
.glosa-section {
    background: #fff;
    border-radius: 8px;
    padding: 2rem;
    margin: 2rem 0;
    border-left: 4px solid #e74c3c;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.glosa-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 1rem;
}

.glosa-label {
    color: #e74c3c;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.glosa-date {
    font-size: 0.875rem;
    color: #999;
}

.glosa-title {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: #2c3e50;
    font-weight: 600;
}

.glosa-content {
    color: #444;
    line-height: 1.8;
    font-size: 1.05rem;
}

.glosa-content p {
    margin-bottom: 1rem;
}

.glosa-content p:last-child {
    margin-bottom: 0;
}

.glosa-content a {
    color: #3498db;
    text-decoration: underline;
    transition: color 0.3s;
}

.glosa-content a:hover {
    color: #2980b9;
}

.glosa-content strong {
    font-weight: 600;
    color: #2c3e50;
}

.glosa-content em {
    font-style: italic;
}

.glosa-author {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #ecf0f1;
    font-size: 0.9rem;
    color: #666;
    text-align: right;
}
```

### Krok 4.3: JavaScript pro načítání glosy

Upravte funkci pro načítání homepage v `index.html`:

```javascript
// Přidat do existující funkce loadHomepage nebo vytvořit novou
async function loadGlosa() {
    try {
        const glosa = await getActiveGlosa();
        const glosaContainer = document.getElementById('glosa-container');
        
        if (glosa && glosaContainer) {
            const glosaHTML = `
                <div class="glosa-section">
                    <div class="glosa-header">
                        <span class="glosa-label">Glosa</span>
                        <span class="glosa-date">
                            ${new Date(glosa.created_at).toLocaleDateString('cs-CZ', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </span>
                    </div>
                    <h2 class="glosa-title">${glosa.title}</h2>
                    <div class="glosa-content">
                        ${glosa.content}
                    </div>
                    <div class="glosa-author">
                        — ${glosa.author}
                    </div>
                </div>
            `;
            glosaContainer.innerHTML = glosaHTML;
            glosaContainer.style.display = 'block';
        } else if (glosaContainer) {
            glosaContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading glosa:', error);
    }
}

// Volat při načítání stránky
document.addEventListener('DOMContentLoaded', async () => {
    await loadGlosa();
    // ... ostatní načítání
});
```

---

## 5. 🧪 Testování

### Checklist pro testování:

#### Databáze
- [ ] SQL skripty se spustily bez chyb
- [ ] Tabulka `glosas` existuje v Supabase
- [ ] Triggery fungují správně

#### Admin rozhraní
- [ ] Záložka "Glosy" se zobrazuje v navigaci
- [ ] Quill editor se načítá správně
- [ ] Počítadlo slov funguje
- [ ] Lze vytvořit novou glosu
- [ ] Lze aktivovat/deaktivovat glosu
- [ ] Lze smazat glosu
- [ ] Pouze jedna glosa může být aktivní

#### Frontend
- [ ] Aktivní glosa se zobrazuje na homepage
- [ ] Glosa je správně umístěná mezi články
- [ ] Formátování (tučné, kurzíva, odkazy) se zobrazuje správně
- [ ] Když není žádná glosa aktivní, nic se nezobrazuje

#### Limity a validace
- [ ] Nelze uložit glosu delší než 300 slov
- [ ] Barevná indikace počtu slov funguje
- [ ] HTML obsah je správně sanitizován

---

## 📝 Poznámky

### Bezpečnostní aspekty
- Quill editor automaticky sanitizuje HTML
- Databázový trigger zajišťuje pouze jednu aktivní glosu
- Všechny vstupy jsou validovány

### Možná budoucí vylepšení
- Historie editací glos
- Plánování publikace (datum od-do)
- Kategorie nebo tagy pro glosy
- Archiv glos s vlastní stránkou
- Preview před publikací
- Editace existujících glos

### Známé limitace
- Editace existující glosy není implementována (lze jen smazat a vytvořit novou)
- Není implementováno verzování
- Chybí možnost náhledu před publikací

---

## 🚀 Deployment

Po implementaci všech kroků:

1. **Otestujte lokálně** všechny funkce
2. **Zálohujte databázi** před nasazením do produkce
3. **Nasaďte postupně**:
   - Nejdřív databázové změny
   - Pak backend změny
   - Nakonec frontend změny
4. **Monitorujte** chyby v konzoli

---

## 📞 Podpora

Pokud narazíte na problémy:
1. Zkontrolujte konzoli prohlížeče pro JavaScript chyby
2. Zkontrolujte Supabase logy pro databázové chyby
3. Ověřte, že všechny funkce jsou správně definované
4. Ujistěte se, že Quill.js je správně načten

---

*Dokumentace vytvořena pro projekt Vědci zjistili - leden 2025*