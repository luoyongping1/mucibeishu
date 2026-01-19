document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('page-title');
    const fab = document.getElementById('fab');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const filesEmpty = document.getElementById('files-empty');
    const fileViewer = document.getElementById('file-viewer');
    const closeViewer = document.getElementById('close-viewer');
    const viewerTitle = document.getElementById('viewer-title');
    const viewerBody = document.getElementById('viewer-body');

    // 耳返相关
    const earReturnViewer = document.getElementById('ear-return-viewer');
    const closeEarReturn = document.getElementById('close-ear-return');
    const minimizeEarReturn = document.getElementById('minimize-ear-return');
    const earReturnStatus = document.getElementById('ear-return-status');
    const btnToggleEarReturn = document.getElementById('btn-toggle-ear-return');
    const pulseRing = document.querySelector('.pulse-ring');

    // 粘贴弹窗相关
    const pasteModal = document.getElementById('paste-modal');
    const pasteFileName = document.getElementById('paste-file-name');
    const pasteArea = document.getElementById('paste-area');
    const btnConfirmPaste = document.getElementById('btn-confirm-paste');
    const btnCancelPaste = document.getElementById('btn-cancel-paste');

    const clozeToolbar = document.getElementById('cloze-toolbar');
    const chapterSidebar = document.getElementById('chapter-sidebar');
    const chapterList = document.getElementById('chapter-list');
    const btnChapterMenu = document.getElementById('btn-chapter-menu');

    const mindmapViewer = document.getElementById('mindmap-viewer');
    const mindmapContent = document.getElementById('mindmap-content');
    const closeMindmap = document.getElementById('close-mindmap');
    const btnSaveMindmap = document.getElementById('btn-save-mindmap');
    const btnCopyMindmap = document.getElementById('btn-copy-mindmap');
    const btnRegenMindmap = document.getElementById('btn-regen-mindmap');

    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalOptions = document.getElementById('modal-options');
    const modalCancel = document.getElementById('modal-cancel');
    
    const cardBoxList = document.getElementById('card-box-list');
    const cardsEmpty = document.getElementById('cards-empty');

    // --- 0. IndexedDB 文件持久化存储 ---
    const dbName = "BackBookDB";
    const storeName = "files";
    const flashcardStoreName = "flashcards";
    const mistakeStoreName = "mistakes";
    const mistakeBookStoreName = "mistakeBooks";
    const characterStoreName = "characters";
    const chatMessageStoreName = "chatMessages";
    let db;

    const initDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 6);
            request.onupgradeneeded = (e) => {
                db = e.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains(flashcardStoreName)) {
                    db.createObjectStore(flashcardStoreName, { keyPath: "fileId" });
                }
                if (!db.objectStoreNames.contains(mistakeStoreName)) {
                    db.createObjectStore(mistakeStoreName, { keyPath: "id", autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(mistakeBookStoreName)) {
                    db.createObjectStore(mistakeBookStoreName, { keyPath: "id", autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(characterStoreName)) {
                    db.createObjectStore(characterStoreName, { keyPath: "id", autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(chatMessageStoreName)) {
                    const msgStore = db.createObjectStore(chatMessageStoreName, { keyPath: "id", autoIncrement: true });
                    msgStore.createIndex("charId", "charId", { unique: false });
                }
            };
            request.onsuccess = (e) => {
                db = e.target.result;
                resolve();
            };
            request.onerror = (e) => reject(e.target.error);
        });
    };

    const saveFileToDB = (fileObj) => {
        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        store.put(fileObj);
    };

    const loadFilesFromDB = () => {
        return new Promise((resolve) => {
            const transaction = db.transaction([storeName], "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    };

    const saveFlashcardsToDB = (flashcardObj) => {
        const transaction = db.transaction([flashcardStoreName], "readwrite");
        const store = transaction.objectStore(flashcardStoreName);
        store.put(flashcardObj);
    };

    const loadFlashcardsFromDB = () => {
        return new Promise((resolve) => {
            const transaction = db.transaction([flashcardStoreName], "readonly");
            const store = transaction.objectStore(flashcardStoreName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    };

    const saveMistakeToDB = (mistakeObj) => {
        const transaction = db.transaction([mistakeStoreName], "readwrite");
        const store = transaction.objectStore(mistakeStoreName);
        store.put(mistakeObj);
    };

    const loadMistakesFromDB = () => {
        return new Promise((resolve) => {
            const transaction = db.transaction([mistakeStoreName], "readonly");
            const store = transaction.objectStore(mistakeStoreName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    };

    const deleteMistakeFromDB = (id) => {
        return new Promise((resolve) => {
            const transaction = db.transaction([mistakeStoreName], "readwrite");
            const store = transaction.objectStore(mistakeStoreName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
        });
    };

    const saveMistakeBookToDB = (bookObj) => {
        return new Promise((resolve) => {
            const transaction = db.transaction([mistakeBookStoreName], "readwrite");
            const store = transaction.objectStore(mistakeBookStoreName);
            const request = store.put(bookObj);
            request.onsuccess = () => resolve(request.result);
        });
    };

    const loadMistakeBooksFromDB = () => {
        return new Promise((resolve) => {
            const transaction = db.transaction([mistakeBookStoreName], "readonly");
            const store = transaction.objectStore(mistakeBookStoreName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    };

    const deleteMistakeBookFromDB = (id) => {
        return new Promise((resolve) => {
            const transaction = db.transaction([mistakeBookStoreName, mistakeStoreName], "readwrite");
            const bookStore = transaction.objectStore(mistakeBookStoreName);
            const mistakeStore = transaction.objectStore(mistakeStoreName);
            
            bookStore.delete(id);
            // 同时删除该本子下的所有错题
            const request = mistakeStore.getAll();
            request.onsuccess = () => {
                const mistakes = request.result;
                mistakes.forEach(m => {
                    if (m.bookId === id) mistakeStore.delete(m.id);
                });
                resolve();
            };
        });
    };

    const saveCharacterToDB = (charObj) => {
        return new Promise((resolve) => {
            const transaction = db.transaction([characterStoreName], "readwrite");
            const store = transaction.objectStore(characterStoreName);
            const request = store.put(charObj);
            request.onsuccess = () => resolve(request.result);
        });
    };

    const loadCharactersFromDB = () => {
        return new Promise((resolve) => {
            const transaction = db.transaction([characterStoreName], "readonly");
            const store = transaction.objectStore(characterStoreName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    };

    const deleteCharacterFromDB = (id) => {
        return new Promise((resolve) => {
            const transaction = db.transaction([characterStoreName, chatMessageStoreName], "readwrite");
            const charStore = transaction.objectStore(characterStoreName);
            const msgStore = transaction.objectStore(chatMessageStoreName);
            
            charStore.delete(id);
            
            // 删除该角色的所有聊天记录
            const index = msgStore.index("charId");
            const request = index.openCursor(IDBKeyRange.only(id));
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
        });
    };

    const saveChatMessageToDB = (msgObj) => {
        return new Promise((resolve) => {
            const transaction = db.transaction([chatMessageStoreName], "readwrite");
            const store = transaction.objectStore(chatMessageStoreName);
            const request = store.put(msgObj);
            request.onsuccess = () => resolve(request.result);
        });
    };

    const loadChatMessagesFromDB = (charId) => {
        return new Promise((resolve) => {
            const transaction = db.transaction([chatMessageStoreName], "readonly");
            const store = transaction.objectStore(chatMessageStoreName);
            const index = store.index("charId");
            const request = index.getAll(IDBKeyRange.only(charId));
            request.onsuccess = () => resolve(request.result);
        });
    };

    const clearChatMessagesFromDB = (charId) => {
        return new Promise((resolve) => {
            const transaction = db.transaction([chatMessageStoreName], "readwrite");
            const store = transaction.objectStore(chatMessageStoreName);
            const index = store.index("charId");
            const request = index.openCursor(IDBKeyRange.only(charId));
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
        });
    };

    // 模拟文件存储
    let uploadedFiles = [];
    let flashcardBoxes = [];
    let currentOpenFile = null;

    // 初始化加载
    initDB().then(async () => {
        uploadedFiles = await loadFilesFromDB();
        flashcardBoxes = await loadFlashcardsFromDB();
        renderFileList();
        renderCardBoxes();
        renderCharacterList();
        initCommunityConnect();
    });

    // --- 1. 底部导航切换逻辑 ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            const title = item.getAttribute('data-title');

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === `section-${target}`) {
                    section.classList.add('active');
                }
            });

            if (target === 'cards') {
                renderCardBoxes();
            } else if (target === 'mistakes') {
                renderMistakes();
            } else if (target === 'community') {
                renderCharacterList();
            }

            pageTitle.textContent = title;
        });
    });

    // --- 通用弹窗逻辑 ---
    function showModal(title, options, callback) {
        modalTitle.textContent = title;
        modalOptions.innerHTML = '';
        options.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'modal-btn';
            btn.textContent = opt.label;
            btn.onclick = () => {
                hideModal();
                callback(opt.value);
            };
            modalOptions.appendChild(btn);
        });
        modalOverlay.style.display = 'flex';
    }

    function hideModal() {
        modalOverlay.style.display = 'none';
    }

    modalCancel.onclick = hideModal;
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) hideModal();
    };

    // --- 2. 悬浮按钮点击上传 ---
    fab.addEventListener('click', (e) => {
        if (fab.classList.contains('dragging')) return;

        const activeSection = document.querySelector('.content-section.active');
        if (activeSection.id === 'section-cards') {
            if (uploadedFiles.length === 0) {
                alert('请先在文件管理中上传文件');
                return;
            }
            const options = uploadedFiles.map(f => ({ label: f.name, value: f.id }));
            showModal('选择文件生成闪卡', options, (fileId) => {
                const file = uploadedFiles.find(f => f.id === fileId);
                generateFlashcards(file);
            });
        } else if (activeSection.id === 'section-mistakes') {
            const name = prompt('请输入错题本名称：');
            if (name && name.trim()) {
                saveMistakeBookToDB({
                    name: name.trim(),
                    date: new Date().toLocaleDateString()
                }).then(() => renderMistakes());
            }
        } else if (activeSection.id === 'section-community') {
            const name = prompt('请输入 AI 搭子姓名：');
            if (name && name.trim()) {
                const persona = prompt('请输入 AI 搭子的人设（例如：严厉的英语老师、温柔的学姐、热血的考研战友）：');
                if (persona && persona.trim()) {
                    saveCharacterToDB({
                        name: name.trim(),
                        persona: persona.trim(),
                        avatar: '🤖',
                        date: new Date().toLocaleDateString()
                    }).then(() => renderCharacterList());
                }
            }
        } else {
            showModal('上传文件', [
                { label: '📁 选择本地文件', value: 'upload' },
                { label: '✍️ 粘贴文本内容', value: 'paste' }
            ], (choice) => {
                if (choice === 'upload') {
                    fileInput.click();
                } else if (choice === 'paste') {
                    pasteModal.style.display = 'flex';
                    pasteFileName.value = '';
                    pasteArea.value = '';
                }
            });
        }
    });

    btnCancelPaste.onclick = () => pasteModal.style.display = 'none';
    btnConfirmPaste.onclick = () => {
        const text = pasteArea.value.trim();
        const name = pasteFileName.value.trim() || '未命名文本';
        if (!text) { alert('请输入内容'); return; }
        
        const newFile = {
            id: Date.now() + Math.random(),
            name: name + '.txt',
            size: (new Blob([text]).size / 1024).toFixed(1) + ' KB',
            type: 'text',
            content: text,
            date: new Date().toLocaleDateString()
        };
        uploadedFiles.push(newFile);
        saveFileToDB(newFile);
        renderFileList();
        pasteModal.style.display = 'none';
    };

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            files.forEach(file => {
                const reader = new FileReader();
                
                if (file.name.endsWith('.docx')) {
                    reader.onload = (event) => {
                        const arrayBuffer = event.target.result;
                        mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
                            .then(result => {
                                const newFile = {
                                    id: Date.now() + Math.random(),
                                    name: file.name,
                                    size: (file.size / 1024).toFixed(1) + ' KB',
                                    type: 'docx',
                                    content: result.value,
                                    date: new Date().toLocaleDateString()
                                };
                                uploadedFiles.push(newFile);
                                saveFileToDB(newFile);
                                renderFileList();
                            });
                    };
                    reader.readAsArrayBuffer(file);
                } else if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                    reader.onload = (event) => {
                        const newFile = {
                            id: Date.now() + Math.random(),
                            name: file.name,
                            size: (file.size / 1024).toFixed(1) + ' KB',
                            type: 'text',
                            content: event.target.result,
                            date: new Date().toLocaleDateString()
                        };
                        uploadedFiles.push(newFile);
                        saveFileToDB(newFile);
                        renderFileList();
                    };
                    reader.readAsText(file);
                } else if (file.type.startsWith('image/')) {
                    reader.onload = (event) => {
                        const newFile = {
                            id: Date.now() + Math.random(),
                            name: file.name,
                            size: (file.size / 1024).toFixed(1) + ' KB',
                            type: 'image',
                            content: event.target.result,
                            date: new Date().toLocaleDateString()
                        };
                        uploadedFiles.push(newFile);
                        saveFileToDB(newFile);
                        renderFileList();
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    });

    function renderFileList() {
        if (uploadedFiles.length === 0) {
            fileList.style.display = 'none';
            filesEmpty.style.display = 'flex';
            return;
        }

        fileList.style.display = 'grid';
        filesEmpty.style.display = 'none';
        fileList.innerHTML = '';

        uploadedFiles.forEach(file => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <div class="file-icon">${getFileIcon(file.name)}</div>
                <div class="file-info">
                    <span class="file-name">${file.name}</span>
                    <span class="file-meta">${file.date} · ${file.size}</span>
                </div>
                <div class="file-edit-btn" onclick="event.stopPropagation(); renameFile(${file.id}, '${file.name}')">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" /></svg>
                </div>
                <div class="file-delete-btn" onclick="event.stopPropagation(); deleteFile(${file.id})">
                    <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19V4M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>
                </div>
            `;
            item.onclick = () => openFileViewer(file);
            fileList.appendChild(item);
        });
    }

    window.deleteFile = (fileId) => {
        if (confirm('确定要删除这个文件吗？相关闪卡也将被移除。')) {
            const transaction = db.transaction([storeName, flashcardStoreName], "readwrite");
            const fileStore = transaction.objectStore(storeName);
            const flashStore = transaction.objectStore(flashcardStoreName);
            
            fileStore.delete(fileId);
            flashStore.delete(fileId);

            transaction.oncomplete = () => {
                uploadedFiles = uploadedFiles.filter(f => f.id != fileId);
                flashcardBoxes = flashcardBoxes.filter(b => b.fileId != fileId);
                renderFileList();
                renderCardBoxes();
            };
        }
    };

    window.renameFile = (fileId, oldName) => {
        const newName = prompt('请输入新的文件名：', oldName);
        if (newName && newName.trim() && newName !== oldName) {
            const transaction = db.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);
            store.get(fileId).onsuccess = (e) => {
                const file = e.target.result;
                file.name = newName.trim();
                store.put(file).onsuccess = () => {
                    const idx = uploadedFiles.findIndex(f => f.id == fileId);
                    if (idx > -1) uploadedFiles[idx].name = file.name;
                    renderFileList();
                };
            };
        }
    };

    function getFileIcon(filename) {
        if (filename.endsWith('.pdf')) return '📕';
        if (filename.endsWith('.doc') || filename.endsWith('.docx')) return '📘';
        if (filename.endsWith('.txt')) return '📄';
        if (/\.(jpg|jpeg|png|gif)$/i.test(filename)) return '🖼️';
        return '📁';
    }

    function openFileViewer(file) {
        currentOpenFile = file;
        currentOpenFile.currentChapterIndex = null;
        viewerTitle.textContent = file.name;
        
        btnChapterMenu.style.visibility = (file.chapters && file.chapters.length > 0) ? 'visible' : 'hidden';
        
        if (file.clozeContent) {
            renderClozeText(file.clozeContent, false);
        } else {
            renderOriginalContent(file);
        }
        
        fileViewer.style.display = 'flex';
    }

    function renderOriginalContent(file) {
        viewerBody.innerHTML = '';
        if (file.type === 'image') {
            viewerBody.innerHTML = `<img src="${file.content}" style="width:100%; border-radius:8px;">`;
        } else if (file.type === 'docx') {
            viewerBody.innerHTML = `<div class="docx-content">${file.content}</div>`;
        } else {
            const pre = document.createElement('pre');
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.wordBreak = 'break-all';
            pre.className = 'original-text';
            pre.textContent = file.content || '无法预览此文件内容';
            viewerBody.appendChild(pre);
        }
    }

    closeViewer.onclick = () => {
        fileViewer.style.display = 'none';
        currentOpenFile = null;
    };

    // --- 挖空模式逻辑 ---
    let isDeleteClozeMode = false;

    document.getElementById('btn-cloze-mode').onclick = () => {
        clozeToolbar.style.display = 'flex';
    };

    document.getElementById('btn-exit-cloze').onclick = () => {
        clozeToolbar.style.display = 'none';
        isDeleteClozeMode = false;
        document.querySelectorAll('.cloze-blank').forEach(b => b.classList.remove('delete-mode'));
    };

    async function performAICloze() {
        if (!currentOpenFile || currentOpenFile.type === 'image') {
            alert('当前文件类型不支持挖空');
            return;
        }

        const config = JSON.parse(localStorage.getItem('apiConfig'));
        if (!config || !config.url || !config.key) {
            alert('请先在设置中配置 AI API');
            return;
        }

        const btn = document.getElementById('btn-ai-cloze');
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ 分析中...';

        try {
            let rawHTML = viewerBody.innerHTML;
            const images = [];
            const placeholderHTML = rawHTML.replace(/<img [^>]*src=['"]([^'"]+)['"][^>]*>/g, (match) => {
                images.push(match);
                return `[[IMG_${images.length - 1}]]`;
            });

            const prompt = `你是一个背书专家。请在提供的HTML文本中识别核心考点、定义、关键数据或结论，并用{{内容}}包裹。
            【规则】
            1. 严禁删减或修改原文任何字符，必须保持HTML结构和[[IMG_N]]占位符原封不动。
            2. 挖空密度适中（每100字约3-5处）。
            3. 仅输出处理后的全文，不要任何解释。
            内容：${placeholderHTML.substring(0, 10000)}`;

            const response = await fetch(`${config.url}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0
                })
            });

            if (!response.ok) throw new Error('AI 请求失败');
            const data = await response.json();
            let aiResult = data.choices[0].message.content;

            images.forEach((imgTag, index) => {
                aiResult = aiResult.split(`[[IMG_${index}]]`).join(imgTag);
            });

            renderClozeText(aiResult);
            
            if (currentOpenFile.currentChapterIndex !== null && currentOpenFile.currentChapterIndex !== undefined) {
                currentOpenFile.chapters[currentOpenFile.currentChapterIndex].clozeContent = aiResult;
            } else {
                currentOpenFile.clozeContent = aiResult;
            }
            saveFileToDB(currentOpenFile);
        } catch (error) {
            alert('AI 挖空失败: ' + error.message);
        } finally {
            btn.innerHTML = originalText;
        }
    }

    document.getElementById('btn-ai-cloze').onclick = performAICloze;

    document.getElementById('btn-manual-cloze').onclick = () => {
        if (!currentOpenFile || currentOpenFile.type === 'image') return;

        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (!selectedText) {
            alert('请先用手指长按选择一段文字');
            return;
        }

        let currentText = "";
        const isChapter = currentOpenFile.currentChapterIndex !== null && currentOpenFile.currentChapterIndex !== undefined;
        
        if (isChapter) {
            const ch = currentOpenFile.chapters[currentOpenFile.currentChapterIndex];
            currentText = ch.clozeContent || ch.content;
        } else {
            currentText = currentOpenFile.clozeContent || currentOpenFile.content;
        }

        if (currentText.includes(selectedText)) {
            const newText = currentText.replace(selectedText, `{{${selectedText}}}`);
            
            if (isChapter) {
                currentOpenFile.chapters[currentOpenFile.currentChapterIndex].clozeContent = newText;
            } else {
                currentOpenFile.clozeContent = newText;
            }
            
            saveFileToDB(currentOpenFile);
            renderClozeText(newText);
            selection.removeAllRanges();
        } else {
            alert('无法在原文中定位选中的文字，请尝试重新选择');
        }
    };

    document.getElementById('btn-delete-cloze').onclick = () => {
        isDeleteClozeMode = !isDeleteClozeMode;
        const btn = document.getElementById('btn-delete-cloze');
        if (isDeleteClozeMode) {
            btn.style.background = '#FF3B30';
            btn.style.color = 'white';
            document.querySelectorAll('.cloze-blank').forEach(b => b.classList.add('delete-mode'));
        } else {
            btn.style.background = '';
            btn.style.color = '';
            document.querySelectorAll('.cloze-blank').forEach(b => b.classList.remove('delete-mode'));
        }
    };

    document.getElementById('btn-reset-cloze').onclick = () => {
        if (!currentOpenFile) return;
        const isChapter = currentOpenFile.currentChapterIndex !== null && currentOpenFile.currentChapterIndex !== undefined;
        
        if (confirm(`确定要清除${isChapter ? '当前章节' : '全篇'}的所有挖空并恢复原文吗？`)) {
            if (isChapter) {
                currentOpenFile.chapters[currentOpenFile.currentChapterIndex].clozeContent = null;
                const ch = currentOpenFile.chapters[currentOpenFile.currentChapterIndex];
                viewerBody.innerHTML = `<div class="chapter-content"><h3>${ch.title}</h3>${ch.content}</div>`;
            } else {
                currentOpenFile.clozeContent = null;
                renderOriginalContent(currentOpenFile);
            }
            saveFileToDB(currentOpenFile);
        }
    };

    function renderClozeText(text, save = true) {
        const html = text.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
            return `<span class="cloze-blank ${isDeleteClozeMode ? 'delete-mode' : ''}" data-raw="${p1}">${p1}</span>`;
        });
        viewerBody.innerHTML = `<div class="cloze-container">${html}</div>`;

        viewerBody.querySelectorAll('.cloze-blank').forEach(blank => {
            blank.onclick = (e) => {
                if (isDeleteClozeMode) {
                    const raw = blank.getAttribute('data-raw');
                    const isChapter = currentOpenFile.currentChapterIndex !== null && currentOpenFile.currentChapterIndex !== undefined;
                    let currentText = isChapter ? currentOpenFile.chapters[currentOpenFile.currentChapterIndex].clozeContent : currentOpenFile.clozeContent;
                    
                    const newText = currentText.replace(`{{${raw}}}`, raw);
                    
                    if (isChapter) {
                        currentOpenFile.chapters[currentOpenFile.currentChapterIndex].clozeContent = newText;
                    } else {
                        currentOpenFile.clozeContent = newText;
                    }
                    saveFileToDB(currentOpenFile);
                    renderClozeText(newText);
                } else {
                    blank.classList.toggle('revealed');
                }
            };
        });
    }

    // --- 思维导图逻辑 ---
    document.getElementById('btn-mindmap').onclick = () => {
        if (!currentOpenFile) return;
        if (currentOpenFile.mindmap) {
            mindmapContent.innerHTML = currentOpenFile.mindmap;
        } else {
            mindmapContent.innerHTML = '<div class="empty-state"><p>点击上方“重新生成”来创建思维导图</p></div>';
        }
        mindmapViewer.style.display = 'flex';
    };

    closeMindmap.onclick = () => {
        mindmapViewer.style.display = 'none';
    };

    btnSaveMindmap.onclick = () => {
        if (!currentOpenFile) return;
        currentOpenFile.mindmap = mindmapContent.innerHTML;
        saveFileToDB(currentOpenFile);
        alert('思维导图已保存');
    };

    btnCopyMindmap.onclick = () => {
        const text = mindmapContent.innerText;
        navigator.clipboard.writeText(text).then(() => {
            alert('思维导图文本已复制到剪贴板');
        }).catch(err => {
            alert('复制失败: ' + err);
        });
    };

    async function performRegenMindmap() {
        if (!currentOpenFile) return;
        
        const config = JSON.parse(localStorage.getItem('apiConfig'));
        if (!config || !config.url || !config.key) {
            alert('请先在设置中配置 AI API');
            return;
        }

        btnRegenMindmap.disabled = true;
        btnRegenMindmap.textContent = '生成中...';
        mindmapContent.innerHTML = '<div class="empty-state">⏳ AI 正在构思思维导图...</div>';

        try {
            const textToAnalyze = viewerBody.innerText.substring(0, 4000);
            const prompt = `请根据以下材料提取逻辑框架，生成思维导图。
            【要求】
            1. 使用 <ul> 和 <li> 嵌套结构。
            2. 根节点名称为：${currentOpenFile.name}。
            3. 所有文字必须包裹在 <span> 标签内。
            4. 逻辑层级清晰，涵盖所有核心章节。
            5. 仅返回 <ul> 开始的HTML代码。
            材料：${textToAnalyze}`;

            const response = await fetch(`${config.url}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0
                })
            });

            if (!response.ok) throw new Error('AI 请求失败');
            const data = await response.json();
            const aiResult = data.choices[0].message.content;
            
            const htmlMatch = aiResult.match(/<ul[\s\S]*<\/ul>/);
            let finalHtml = htmlMatch ? htmlMatch[0] : `<ul><li><span>${aiResult}</span></li></ul>`;
            
            if (!finalHtml.includes('<span>')) {
                finalHtml = finalHtml.replace(/<li>([^<]+)/g, '<li><span>$1</span>');
            }

            mindmapContent.innerHTML = `<div class="mindmap-tree">${finalHtml}</div>`;
        } catch (error) {
            mindmapContent.innerHTML = `<div class="empty-state"><p style="color:red;">生成失败: ${error.message}</p></div>`;
        } finally {
            btnRegenMindmap.disabled = false;
            btnRegenMindmap.textContent = '重新生成';
        }
    }

    btnRegenMindmap.onclick = performRegenMindmap;

    // AI 朗读功能 (带兼容性备选方案)
    let synth = window.speechSynthesis;
    let audioPlayer = new Audio(); 

    document.getElementById('btn-read').onclick = () => {
        if (!currentOpenFile || currentOpenFile.type === 'image') return;
        
        if (synth.speaking || !audioPlayer.paused) {
            synth.cancel();
            audioPlayer.pause();
            audioPlayer.src = "";
            resetReadBtn();
            return;
        }

        let textToRead = getCleanTextToRead();
        if (!textToRead) {
            alert('没有可朗读的文本内容');
            return;
        }

        const btn = document.getElementById('btn-read');
        btn.innerHTML = '<div class="action-icon">⏹️</div><span>停止</span>';
        btn.classList.add('active');

        if (window.speechSynthesis && SpeechSynthesisUtterance) {
            const utterance = new SpeechSynthesisUtterance(textToRead.substring(0, 3000));
            utterance.lang = 'zh-CN';
            utterance.onend = resetReadBtn;
            utterance.onerror = () => fallbackRead(textToRead);
            synth.speak(utterance);
        } else {
            fallbackRead(textToRead);
        }
    };

    function getCleanTextToRead() {
        let text = "";
        const isChapter = currentOpenFile.currentChapterIndex !== null && currentOpenFile.currentChapterIndex !== undefined;
        if (isChapter) {
            const ch = currentOpenFile.chapters[currentOpenFile.currentChapterIndex];
            text = ch.clozeContent ? ch.clozeContent : viewerBody.innerHTML;
        } else {
            text = currentOpenFile.clozeContent ? currentOpenFile.clozeContent : viewerBody.innerHTML;
        }
        return text.replace(/\{\{(.*?)\}\}/g, '$1')
                   .replace(/<[^>]+>/g, ' ')
                   .replace(/\[\[IMG_\d+\]\]/g, '')
                   .replace(/\s+/g, ' ').trim();
    }

    function resetReadBtn() {
        const btn = document.getElementById('btn-read');
        btn.innerHTML = '<div class="action-icon">🔊</div><span>AI朗读</span>';
        btn.classList.remove('active');
    }

    function fallbackRead(text) {
        const shortText = text.substring(0, 500);
        audioPlayer.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(shortText)}&le=zh`;
        audioPlayer.play().catch(e => {
            alert('当前浏览器不支持语音功能，请尝试更换 Chrome 或 Edge 浏览器');
            resetReadBtn();
        });
        audioPlayer.onended = resetReadBtn;
    }

    // AI 出题功能
    const quizViewer = document.getElementById('quiz-viewer');
    const quizDisplayBody = document.getElementById('quiz-display-body');
    const quizTypeTitle = document.getElementById('quiz-type-title');
    const closeQuiz = document.getElementById('close-quiz');
    const btnRegenQuiz = document.getElementById('btn-regen-quiz');

    closeQuiz.onclick = () => {
        quizViewer.style.display = 'none';
    };

    document.getElementById('btn-quiz').onclick = () => {
        if (!currentOpenFile || currentOpenFile.type === 'image') {
            alert('当前文件类型不支持出题');
            return;
        }

        // 如果已有保存的题目，直接显示
        if (currentOpenFile.quizzes && currentOpenFile.quizzes.length > 0) {
            renderQuizPage(currentOpenFile.quizzes);
            return;
        }

        const options = [{ label: '全篇内容', value: 'all' }];
        if (currentOpenFile.chapters) {
            currentOpenFile.chapters.forEach((ch, idx) => {
                options.push({ label: `章节：${ch.title}`, value: `chapter_${idx}` });
            });
        }

        showModal('选择出题范围', options, (range) => {
            showModal('选择题目数量', [
                { label: '5 道', value: 5 },
                { label: '10 道', value: 10 },
                { label: '15 道', value: 15 }
            ], (count) => {
                startQuizAI(range, count);
            });
        });
    };

    btnRegenQuiz.onclick = () => {
        if (!currentOpenFile || currentOpenFile.type === 'image') return;
        
        const options = [{ label: '全篇内容', value: 'all' }];
        if (currentOpenFile.chapters) {
            currentOpenFile.chapters.forEach((ch, idx) => {
                options.push({ label: `章节：${ch.title}`, value: `chapter_${idx}` });
            });
        }

        showModal('重新生成：选择出题范围', options, (range) => {
            showModal('重新生成：选择题目数量', [
                { label: '5 道', value: 5 },
                { label: '10 道', value: 10 },
                { label: '15 道', value: 15 }
            ], (count) => {
                startQuizAI(range, count);
            });
        });
    };

    async function startQuizAI(range, count) {
        const config = JSON.parse(localStorage.getItem('apiConfig'));
        if (!config || !config.url || !config.key) {
            alert('请先在设置中配置 AI API');
            return;
        }

        const btn = document.getElementById('btn-quiz');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<div class="action-icon">⏳</div><span>出题中...</span>';

        try {
            let textToAnalyze = "";
            if (range === 'all') {
                textToAnalyze = currentOpenFile.type === 'docx' ? currentOpenFile.content : currentOpenFile.content;
                textToAnalyze = textToAnalyze.replace(/<[^>]+>/g, '').substring(0, 3000);
            } else if (range.startsWith('chapter_')) {
                const idx = parseInt(range.split('_')[1]);
                textToAnalyze = currentOpenFile.chapters[idx].content;
            } else {
                textToAnalyze = viewerBody.innerText.substring(0, 2000);
            }

            const prompt = `你是一个出题专家。请根据材料出${count}道高质量练习题。
            【要求】
            1. 题型包含“选择题”和“填空题”。
            2. 考点覆盖全面，难度适中。
            3. 严格按JSON格式返回数组，严禁包含Markdown代码块标识。
            格式示例：[{"type":"选择题","question":"问题","options":["A","B","C","D"],"answer":"A"},{"type":"填空题","question":"问题___部分","answer":"答案"}]
            材料：${textToAnalyze}`;

            const response = await fetch(`${config.url}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0
                })
            });

            if (!response.ok) throw new Error('AI 请求失败');
            const data = await response.json();
            let quizData;
            try {
                const content = data.choices[0].message.content.trim();
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                quizData = JSON.parse(jsonMatch ? jsonMatch[0] : content);
            } catch (e) {
                throw new Error('AI 返回格式错误，请重试');
            }

            // 保存题目到当前文件并持久化
            currentOpenFile.quizzes = quizData;
            saveFileToDB(currentOpenFile);

            renderQuizPage(quizData);
        } catch (error) {
            alert('AI 出题失败: ' + error.message);
        } finally {
            btn.innerHTML = originalHTML;
        }
    }

    async function renderQuizPage(quizData) {
        quizDisplayBody.innerHTML = '';
        quizTypeTitle.textContent = 'AI 练习题';

        const books = await loadMistakeBooksFromDB();

        quizData.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'quiz-card';
            
            let optionsHtml = '';
            if (item.type === '选择题' && item.options) {
                optionsHtml = `
                    <div class="quiz-options">
                        ${item.options.map(opt => `<div class="quiz-option">${opt}</div>`).join('')}
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="quiz-question">${index + 1}. ${item.question}</div>
                ${optionsHtml}
                <div class="quiz-answer-box">
                    <span class="view-answer">点击查看答案</span>
                    <button class="add-mistake-btn">加入错题本</button>
                </div>
            `;

            const options = card.querySelectorAll('.quiz-option');
            options.forEach(opt => {
                opt.onclick = () => {
                    options.forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                };
            });

            const viewAnswer = card.querySelector('.view-answer');
            viewAnswer.onclick = () => {
                viewAnswer.innerHTML = `<span style="color:var(--primary-color); font-weight:bold;">正确答案：${item.answer}</span>`;
            };

            const addBtn = card.querySelector('.add-mistake-btn');
            addBtn.onclick = () => {
                if (addBtn.classList.contains('added')) return;
                
                if (books.length === 0) {
                    // 如果没有错题本，创建一个默认的
                    const defaultName = "默认错题本";
                    saveMistakeBookToDB({ name: defaultName, date: new Date().toLocaleDateString() }).then(bookId => {
                        saveMistakeToDB({
                            ...item,
                            bookId: bookId,
                            date: new Date().toLocaleString(),
                            fileId: currentOpenFile ? currentOpenFile.id : null,
                            fileName: currentOpenFile ? currentOpenFile.name : '未知文件'
                        });
                        addBtn.textContent = '已加入';
                        addBtn.classList.add('added');
                        // 刷新books列表以防连续添加
                        loadMistakeBooksFromDB().then(newBooks => books.push(...newBooks));
                    });
                } else {
                    const bookOptions = books.map(b => ({ label: b.name, value: b.id }));
                    showModal('选择目标错题本', bookOptions, (bookId) => {
                        saveMistakeToDB({
                            ...item,
                            bookId: bookId,
                            date: new Date().toLocaleString(),
                            fileId: currentOpenFile ? currentOpenFile.id : null,
                            fileName: currentOpenFile ? currentOpenFile.name : '未知文件'
                        });
                        addBtn.textContent = '已加入';
                        addBtn.classList.add('added');
                    });
                }
            };

            quizDisplayBody.appendChild(card);
        });

        quizViewer.style.display = 'flex';
    }

    // --- 章节划分逻辑 ---
    async function performDivideChapters() {
        if (!currentOpenFile || currentOpenFile.type === 'image') return;

        const config = JSON.parse(localStorage.getItem('apiConfig'));
        if (!config || !config.url || !config.key) {
            alert('请先在设置中配置 AI API');
            return;
        }

        const btn = document.getElementById('btn-divide-chapters');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<div class="action-icon">⏳</div><span>划分中...</span>';

        try {
            let rawHTML = currentOpenFile.content;
            const images = [];
            const placeholderHTML = rawHTML.replace(/<img [^>]*src=['"]([^'"]+)['"][^>]*>/g, (match) => {
                images.push(match);
                return `[[IMG_${images.length - 1}]]`;
            });

            const prompt = `请将以下长文本按逻辑结构划分为5-10个章节。
            【要求】
            1. 必须包含全部原文，严禁删减。
            2. 保持HTML标签和[[IMG_N]]占位符完整。
            3. 仅返回JSON数组格式：[{"title":"章节标题", "content":"该章节HTML内容"}]。
            内容：${placeholderHTML.substring(0, 15000)}`;

            const response = await fetch(`${config.url}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0
                })
            });

            if (!response.ok) throw new Error('AI 请求失败');
            const data = await response.json();
            const aiContent = data.choices[0].message.content.trim();
            const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
            let chapters = JSON.parse(jsonMatch ? jsonMatch[0] : aiContent);

            chapters = chapters.map(ch => {
                let restoredContent = ch.content;
                images.forEach((imgTag, index) => {
                    restoredContent = restoredContent.split(`[[IMG_${index}]]`).join(imgTag);
                });
                return { ...ch, content: restoredContent };
            });

            currentOpenFile.chapters = chapters;
            saveFileToDB(currentOpenFile);
            
            renderChapterList();
            btnChapterMenu.style.visibility = 'visible';
            alert(`成功划分为 ${chapters.length} 个章节！点击右上角菜单查看。`);
        } catch (error) {
            console.error('划分失败详情:', error);
            alert('划分失败: ' + error.message);
        } finally {
            btn.innerHTML = originalHTML;
        }
    }

    document.getElementById('btn-divide-chapters').onclick = performDivideChapters;

    function renderChapterList() {
        chapterList.innerHTML = '';
        
        const allItem = document.createElement('div');
        allItem.className = 'chapter-item active';
        allItem.textContent = '显示全篇';
        allItem.onclick = () => {
            currentOpenFile.currentChapterIndex = null;
            if (currentOpenFile.clozeContent) {
                renderClozeText(currentOpenFile.clozeContent, false);
            } else {
                renderOriginalContent(currentOpenFile);
            }
            closeChapterSidebar();
            updateActiveChapter(allItem);
        };
        chapterList.appendChild(allItem);

        currentOpenFile.chapters.forEach((ch, index) => {
            const item = document.createElement('div');
            item.className = 'chapter-item';
            if (currentOpenFile.currentChapterIndex === index) item.classList.add('active');
            item.textContent = ch.title;
            item.onclick = () => {
                currentOpenFile.currentChapterIndex = index;
                if (ch.clozeContent) {
                    renderClozeText(ch.clozeContent, false);
                } else {
                    viewerBody.innerHTML = `<div class="chapter-content"><h3>${ch.title}</h3>${ch.content}</div>`;
                }
                closeChapterSidebar();
                updateActiveChapter(item);
            };
            chapterList.appendChild(item);
        });
    }

    function updateActiveChapter(activeItem) {
        document.querySelectorAll('.chapter-item').forEach(i => i.classList.remove('active'));
        activeItem.classList.add('active');
    }

    btnChapterMenu.onclick = () => {
        if (currentOpenFile.chapters) {
            renderChapterList();
            chapterSidebar.classList.add('active');
        }
    };

    document.getElementById('close-sidebar').onclick = closeChapterSidebar;

    function closeChapterSidebar() {
        chapterSidebar.classList.remove('active');
    }

    // --- 闪卡功能 ---
    function generateFlashcards(file) {
        const options = [
            { label: '全篇内容', value: 'all' },
            { label: '前 2000 字', value: 'limit' }
        ];
        if (file.chapters) {
            file.chapters.forEach((ch, idx) => {
                options.push({ label: `章节：${ch.title}`, value: `chapter_${idx}` });
            });
        }
        showModal('选择生成范围', options, (range) => {
            processFlashcardGeneration(file, range);
        });
    }

    async function processFlashcardGeneration(file, range) {
        const config = JSON.parse(localStorage.getItem('apiConfig'));
        if (!config || !config.url || !config.key) {
            alert('请先在设置中配置 AI API');
            return;
        }

        if (flashcardBoxes.find(b => b.fileId === file.id)) {
            if (!confirm('该文件已生成过闪卡，是否重新生成？')) return;
        }

        const btn = fab;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<div class="action-icon" style="font-size:24px; font-weight:bold; letter-spacing:2px;">...</div>';
        btn.classList.add('loading');

        try {
            let textToAnalyze = "";
            if (range === 'all') {
                textToAnalyze = file.type === 'docx' ? file.content.replace(/<[^>]+>/g, '') : file.content;
                textToAnalyze = textToAnalyze.substring(0, 6000);
            } else if (range === 'limit') {
                textToAnalyze = file.type === 'docx' ? file.content.replace(/<[^>]+>/g, '') : file.content;
                textToAnalyze = textToAnalyze.substring(0, 2000);
            } else if (range.startsWith('chapter_')) {
                const idx = parseInt(range.split('_')[1]);
                textToAnalyze = file.chapters[idx].content.replace(/<[^>]+>/g, '');
            }

            const prompt = `你是一个顶级的教育专家和记忆大师。请对提供的材料进行深度解析，并制作一套极其详尽的双面闪卡。
            【核心目标】
            必须覆盖材料中的“每一个”知识点、定义、关键细节、因果关系和重要事实。严禁遗漏任何细微的考点。
            
            【制作要求】
            1. 颗粒度极细：不要将多个知识点挤在一张卡片上，应将其拆解为多个原子化的闪卡。
            2. 数量要求：根据材料长度，制作 15-30 张闪卡（如果材料内容极多，请尽可能多地生成以确保全覆盖）。
            3. 正面 (front)：简洁的问题、术语、填空或需要解释的关键词。
            4. 背面 (back)：准确、详尽、逻辑清晰的答案或解释。
            5. 独立性：每张闪卡必须能独立理解，不依赖其他卡片。
            
            【输出格式】
            严格按 JSON 数组格式返回，严禁包含任何 Markdown 标识：[{"front":"正面内容","back":"背面内容"}]。
            
            材料内容：
            ${textToAnalyze}`;

            const response = await fetch(`${config.url}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0
                })
            });

            if (!response.ok) throw new Error('AI 请求失败');
            const data = await response.json();
            const content = data.choices[0].message.content.trim();
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            const cards = JSON.parse(jsonMatch ? jsonMatch[0] : content).map(c => ({
                ...c,
                level: 0,
                lastReview: null
            }));

            const newBox = {
                fileId: file.id,
                fileName: file.name,
                cards: cards,
                date: new Date().toLocaleDateString()
            };

            const index = flashcardBoxes.findIndex(b => b.fileId === file.id);
            if (index > -1) flashcardBoxes[index] = newBox;
            else flashcardBoxes.push(newBox);

            saveFlashcardsToDB(newBox);
            renderCardBoxes();
            alert('闪卡生成成功！');
        } catch (error) {
            alert('生成失败: ' + error.message);
        } finally {
            btn.innerHTML = originalHTML;
            btn.classList.remove('loading');
        }
    }

    function renderCardBoxes() {
        if (flashcardBoxes.length === 0) {
            cardBoxList.style.display = 'none';
            cardsEmpty.style.display = 'flex';
            return;
        }

        cardBoxList.style.display = 'grid';
        cardsEmpty.style.display = 'none';
        cardBoxList.innerHTML = '';

        flashcardBoxes.forEach(box => {
            const item = document.createElement('div');
            item.className = 'card-box';
            
            const masteredCount = box.cards.filter(c => (c.level || 0) >= 3).length;
            const progress = Math.round((masteredCount / box.cards.length) * 100);

            item.innerHTML = `
                <div class="card-box-delete" onclick="event.stopPropagation(); deleteFlashcardBox(${box.fileId})">×</div>
                <div class="box-icon">📦</div>
                <div class="box-name">${box.fileName}</div>
                <div class="box-count">${box.cards.length} 张 · 掌握 ${progress}%</div>
                <div class="card-progress-bar">
                    <div class="card-progress-fill" style="width: ${progress}%"></div>
                </div>
            `;
            item.onclick = () => startFlashcardSession(box);
            cardBoxList.appendChild(item);
        });
    }

    window.deleteFlashcardBox = (fileId) => {
        if (confirm('确定要删除这个闪卡盒吗？')) {
            const transaction = db.transaction([flashcardStoreName], "readwrite");
            const store = transaction.objectStore(flashcardStoreName);
            store.delete(fileId).onsuccess = () => {
                flashcardBoxes = flashcardBoxes.filter(b => b.fileId != fileId);
                renderCardBoxes();
            };
        }
    };

    const cardViewer = document.getElementById('card-viewer');
    const closeCardViewer = document.getElementById('close-card-viewer');
    const cardFlipMain = document.getElementById('card-flip-main');
    const cardFrontText = document.getElementById('card-front-text');
    const cardBackText = document.getElementById('card-back-text');
    const cardCurrentIndex = document.getElementById('card-current-index');
    const cardTotalCount = document.getElementById('card-total-count');
    const prevCardBtn = document.getElementById('prev-card');
    const nextCardBtn = document.getElementById('next-card');
    const cardFeedbackControls = document.getElementById('card-feedback-controls');

    let currentSessionCards = [];
    let currentCardIndex = 0;
    let currentSessionBox = null;

    function startFlashcardSession(box) {
        currentSessionBox = box;
        currentSessionCards = box.cards;
        currentCardIndex = 0;
        cardTotalCount.textContent = currentSessionCards.length;
        updateCardDisplay();
        cardViewer.style.display = 'flex';
    }

    function updateCardDisplay() {
        const card = currentSessionCards[currentCardIndex];
        cardFrontText.textContent = card.front;
        cardBackText.textContent = card.back;
        cardCurrentIndex.textContent = currentCardIndex + 1;
        cardFlipMain.classList.remove('flipped');
        cardFeedbackControls.style.display = 'none';
    }

    cardFlipMain.onclick = () => {
        const isFlipped = cardFlipMain.classList.toggle('flipped');
        cardFeedbackControls.style.display = isFlipped ? 'grid' : 'none';
    };

    document.querySelectorAll('.feedback-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const level = parseInt(btn.getAttribute('data-level'));
            const card = currentSessionCards[currentCardIndex];
            
            card.level = level;
            card.lastReview = new Date().getTime();
            
            saveFlashcardsToDB(currentSessionBox);
            
            if (currentCardIndex < currentSessionCards.length - 1) {
                setTimeout(() => {
                    currentCardIndex++;
                    updateCardDisplay();
                }, 300);
            } else {
                alert('本组闪卡已学习完毕！');
                cardViewer.style.display = 'none';
                renderCardBoxes();
            }
        };
    });

    // 闪卡滑动切换功能
    let cardTouchStartX = 0;
    let cardTouchEndX = 0;

    cardFlipMain.addEventListener('touchstart', e => {
        cardTouchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    cardFlipMain.addEventListener('touchend', e => {
        cardTouchEndX = e.changedTouches[0].screenX;
        const swipeThreshold = 50;
        if (cardTouchEndX < cardTouchStartX - swipeThreshold) {
            // 向左滑 -> 下一张
            if (currentCardIndex < currentSessionCards.length - 1) {
                currentCardIndex++;
                updateCardDisplay();
            }
        } else if (cardTouchEndX > cardTouchStartX + swipeThreshold) {
            // 向右滑 -> 上一张
            if (currentCardIndex > 0) {
                currentCardIndex--;
                updateCardDisplay();
            }
        }
    }, { passive: true });

    prevCardBtn.onclick = (e) => {
        e.stopPropagation();
        if (currentCardIndex > 0) {
            currentCardIndex--;
            updateCardDisplay();
        }
    };

    nextCardBtn.onclick = (e) => {
        e.stopPropagation();
        if (currentCardIndex < currentSessionCards.length - 1) {
            currentCardIndex++;
            updateCardDisplay();
        } else {
            alert('已经是最后一张了！');
        }
    };

    closeCardViewer.onclick = () => {
        cardViewer.style.display = 'none';
        renderCardBoxes();
    };

    // --- 耳返逻辑实现 ---
    let audioCtx = null;
    let micStream = null;
    let earReturnNode = null;

    document.getElementById('btn-ear-return').onclick = () => {
        earReturnViewer.style.display = 'flex';
    };

    closeEarReturn.onclick = async () => {
        await stopEarReturn();
        earReturnViewer.style.display = 'none';
        earReturnViewer.classList.remove('minimized');
    };

    minimizeEarReturn.onclick = () => {
        earReturnViewer.classList.toggle('minimized');
    };

    btnToggleEarReturn.onclick = async () => {
        if (micStream) {
            await stopEarReturn();
        } else {
            await startEarReturn();
        }
    };

    async function startEarReturn() {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            micStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            
            const source = audioCtx.createMediaStreamSource(micStream);
            earReturnNode = audioCtx.createGain();
            earReturnNode.gain.value = 1.0;
            
            source.connect(earReturnNode);
            earReturnNode.connect(audioCtx.destination);
            
            earReturnStatus.textContent = "耳返已开启";
            earReturnStatus.style.color = "#34C759";
            btnToggleEarReturn.textContent = "关闭耳返";
            btnToggleEarReturn.style.background = "#FF3B30";
            pulseRing.classList.add('active');
        } catch (err) {
            alert("开启耳返失败，请确保已授予麦克风权限并佩戴耳机：" + err.message);
        }
    }

    async function stopEarReturn() {
        if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
            micStream = null;
        }
        if (audioCtx) {
            await audioCtx.close();
            audioCtx = null;
        }
        earReturnStatus.textContent = "准备就绪";
        earReturnStatus.style.color = "#34C759";
        btnToggleEarReturn.textContent = "开启耳返";
        btnToggleEarReturn.style.background = "var(--primary-color)";
        pulseRing.classList.remove('active');
    }

    // --- 一键 AI 串行逻辑 ---
    document.getElementById('btn-one-click-ai').onclick = async () => {
        if (!currentOpenFile || currentOpenFile.type === 'image') return;
        
        const config = JSON.parse(localStorage.getItem('apiConfig'));
        if (!config || !config.url || !config.key) {
            alert('请先在设置中配置 AI API');
            return;
        }

        if (!confirm('“一键 AI”将按顺序自动完成：划分章节、AI挖空、思维导图、AI出题和闪卡生成。这可能需要一分钟左右，确定开始吗？')) return;

        const btn = document.getElementById('btn-one-click-ai');
        const originalHTML = btn.innerHTML;
        btn.style.background = "#8E8E93";
        
        const steps = [
            { name: '划分章节', fn: () => performDivideChapters() },
            { name: 'AI 挖空', fn: () => performAICloze() },
            { name: '思维导图', fn: () => performRegenMindmap() },
            { name: 'AI 出题', fn: () => startQuizAI('all', 10) },
            { name: '生成闪卡', fn: () => processFlashcardGeneration(currentOpenFile, 'all') }
        ];

        try {
            for (let i = 0; i < steps.length; i++) {
                btn.innerHTML = `<div class="action-icon">⏳</div><span>${steps[i].name}...</span>`;
                await steps[i].fn();
                // 给 UI 和 API 一点缓冲时间
                await new Promise(r => setTimeout(r, 1500));
            }
            alert('一键 AI 处理完成！所有功能已就绪。');
        } catch (err) {
            alert('一键 AI 在 [' + steps[i].name + '] 步骤出错: ' + err.message);
        } finally {
            btn.innerHTML = originalHTML;
            btn.style.background = "linear-gradient(135deg, #6e8efb, #a777e3)";
        }
    };

    // --- 导出练习题逻辑 ---
    document.getElementById('btn-export-quiz').onclick = () => {
        const cards = quizDisplayBody.querySelectorAll('.quiz-card');
        if (cards.length === 0) {
            alert('当前没有可导出的题目');
            return;
        }

        let content = `背书助手 - AI 练习题导出\n文件：${currentOpenFile ? currentOpenFile.name : '未知'}\n导出日期：${new Date().toLocaleString()}\n\n`;
        
        cards.forEach((card, index) => {
            const q = card.querySelector('.quiz-question').textContent;
            const opts = Array.from(card.querySelectorAll('.quiz-option')).map(o => o.textContent.trim());
            const ans = card.querySelector('.view-answer').textContent;
            
            content += `${q}\n`;
            if (opts.length > 0) {
                opts.forEach(opt => content += `${opt}\n`);
            }
            content += `【答案】${ans}\n\n`;
        });

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `练习题_${currentOpenFile ? currentOpenFile.name.split('.')[0] : 'export'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // --- 3. 悬浮按钮拖拽逻辑 ---
    let isDragging = false;
    let startX, startY;

    const savedPosition = JSON.parse(localStorage.getItem('fabPosition'));
    if (savedPosition) {
        fab.style.left = savedPosition.x + 'px';
        fab.style.top = savedPosition.y + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
    } else {
        const defaultX = window.innerWidth - 80;
        const defaultY = window.innerHeight - 160;
        fab.style.left = defaultX + 'px';
        fab.style.top = defaultY + 'px';
    }

    const onStart = (e) => {
        isDragging = true;
        fab.classList.add('dragging');
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        const rect = fab.getBoundingClientRect();
        startX = clientX - rect.left;
        startY = clientY - rect.top;
    };

    const onMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
         const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        let x = clientX - startX;
        let y = clientY - startY;
        const padding = 10;
        const navHeight = 84;
        const maxX = window.innerWidth - fab.offsetWidth - padding;
        const maxY = window.innerHeight - fab.offsetHeight - navHeight - padding;
        x = Math.max(padding, Math.min(x, maxX));
        y = Math.max(padding, Math.min(y, maxY));
        fab.style.left = x + 'px';
        fab.style.top = y + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
    };

    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        fab.classList.remove('dragging');
        const rect = fab.getBoundingClientRect();
        localStorage.setItem('fabPosition', JSON.stringify({ x: rect.left, y: rect.top }));
    };

    fab.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    fab.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);

    // --- 错题集渲染逻辑 ---
    let currentMistakeBookId = null;

    async function renderMistakes() {
        const mistakeGroups = document.getElementById('mistake-groups');
        const mistakesEmpty = document.getElementById('mistakes-empty');
        const mistakeActions = document.getElementById('mistake-actions');

        const books = await loadMistakeBooksFromDB();
        const allMistakes = await loadMistakesFromDB();

        if (books.length === 0 && allMistakes.length === 0) {
            mistakeGroups.style.display = 'none';
            mistakesEmpty.style.display = 'flex';
            mistakeActions.style.display = 'none';
            return;
        }

        mistakeGroups.style.display = 'flex';
        mistakesEmpty.style.display = 'none';
        mistakeActions.style.display = 'block';
        mistakeGroups.innerHTML = '';

        if (currentMistakeBookId === null) {
            // 渲染错题本列表
            books.forEach(book => {
                const bookMistakes = allMistakes.filter(m => m.bookId === book.id);
                const item = document.createElement('div');
                item.className = 'mistake-book-item';
                item.innerHTML = `
                    <div class="book-icon">📚</div>
                    <div class="book-info">
                        <div class="book-name">${book.name}</div>
                        <div class="book-meta">${bookMistakes.length} 道错题 · ${book.date}</div>
                    </div>
                    <div class="book-actions">
                        <div class="book-action-btn" onclick="event.stopPropagation(); renameMistakeBook(${book.id}, '${book.name}')">✏️</div>
                        <div class="book-action-btn" onclick="event.stopPropagation(); deleteMistakeBook(${book.id})">🗑️</div>
                    </div>
                `;
                item.onclick = () => {
                    currentMistakeBookId = book.id;
                    renderMistakes();
                };
                mistakeGroups.appendChild(item);
            });
        } else {
            // 渲染特定错题本内的错题
            const currentBook = books.find(b => b.id === currentMistakeBookId);
            const bookMistakes = allMistakes.filter(m => m.bookId === currentMistakeBookId);

            const backBtn = document.createElement('div');
            backBtn.className = 'mistake-back-btn';
            backBtn.innerHTML = `<span>← 返回错题本列表</span> <strong>${currentBook ? currentBook.name : ''}</strong>`;
            backBtn.onclick = () => {
                currentMistakeBookId = null;
                renderMistakes();
            };
            mistakeGroups.appendChild(backBtn);

            if (bookMistakes.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'empty-state';
                empty.style.padding = '40px 20px';
                empty.innerHTML = '<p>该错题本暂无错题</p>';
                mistakeGroups.appendChild(empty);
            } else {
                bookMistakes.slice().reverse().forEach(mistake => {
                    const item = document.createElement('div');
                    item.className = 'quiz-card';
                    item.style.marginBottom = '12px';
                    
                    let optionsHtml = '';
                    if (mistake.type === '选择题' && mistake.options) {
                        optionsHtml = `
                            <div class="quiz-options" style="margin-top:10px;">
                                ${mistake.options.map(opt => `
                                    <div class="quiz-option ${opt === mistake.answer ? 'selected' : ''}" style="padding:8px 12px; font-size:13px;">
                                        ${opt}
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }

                    item.innerHTML = `
                        <div class="mistake-item-delete" onclick="deleteMistake(${mistake.id})" style="cursor:pointer; opacity:0.6;">🗑️</div>
                        <div class="quiz-question" style="font-size:14px; font-weight:500; margin-right:24px; line-height:1.4;">${mistake.question}</div>
                        ${optionsHtml}
                        <div class="quiz-answer-box" style="display:block; color:var(--primary-color); font-weight:600; border-top: 1px dashed #EEE; margin-top:12px; padding-top:10px; font-size:13px;">
                            正确答案：${mistake.answer}
                        </div>
                        <div style="font-size:10px; color:#CCC; margin-top:8px; text-align:right;">${mistake.fileName} · ${mistake.date || ''}</div>
                    `;
                    mistakeGroups.appendChild(item);
                });
            }
        }
    }

    window.renameMistakeBook = (id, oldName) => {
        const newName = prompt('请输入新的错题本名称：', oldName);
        if (newName && newName.trim() && newName !== oldName) {
            const transaction = db.transaction([mistakeBookStoreName], "readwrite");
            const store = transaction.objectStore(mistakeBookStoreName);
            store.get(id).onsuccess = (e) => {
                const book = e.target.result;
                book.name = newName.trim();
                store.put(book).onsuccess = () => renderMistakes();
            };
        }
    };

    window.deleteMistakeBook = async (id) => {
        if (confirm('确定要删除这个错题本及其内部所有错题吗？')) {
            await deleteMistakeBookFromDB(id);
            if (currentMistakeBookId === id) currentMistakeBookId = null;
            renderMistakes();
        }
    };

    window.deleteMistake = async (id) => {
        if (confirm('确定要删除这道错题吗？')) {
            await deleteMistakeFromDB(id);
            renderMistakes();
        }
    };

    document.getElementById('btn-export-mistakes-pdf').onclick = () => {
        if (currentMistakeBookId === null) {
            alert('请先进入一个具体的错题本再进行导出。');
            return;
        }
        window.print();
    };

    document.getElementById('btn-clear-mistakes').onclick = () => {
        if (confirm('确定要清空所有错题吗？')) {
            const transaction = db.transaction([mistakeStoreName], "readwrite");
            transaction.objectStore(mistakeStoreName).clear().onsuccess = () => renderMistakes();
        }
    };

    // --- 5. AI 搭子逻辑 ---
    const characterListContainer = document.getElementById('character-list-container');
    const charactersEmpty = document.getElementById('characters-empty');
    const chatViewer = document.getElementById('chat-viewer');
    const closeChat = document.getElementById('close-chat');
    const chatCharacterName = document.getElementById('chat-character-name');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const btnSendChat = document.getElementById('btn-send-chat');
    const btnAiReply = document.getElementById('btn-ai-reply');
    const btnClearChat = document.getElementById('btn-clear-chat');
    const btnToggleAction = document.getElementById('btn-toggle-action');
    const avatarInput = document.getElementById('avatar-input');

    let currentChatCharacter = null;
    let isActionEnabled = false;

    // 动描开关逻辑
    btnToggleAction.onclick = () => {
        isActionEnabled = !isActionEnabled;
        btnToggleAction.classList.toggle('active', isActionEnabled);
        btnToggleAction.textContent = `动描: ${isActionEnabled ? '开' : '关'}`;
    };

    // 更换头像逻辑
    avatarInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file || !currentChatCharacter) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result;
            currentChatCharacter.avatar = base64;
            saveCharacterToDB(currentChatCharacter).then(() => {
                renderCharacterList();
                // 更新当前聊天窗口的头像（如果有显示的话，目前是 emoji）
                alert('头像更换成功！');
            });
        };
        reader.readAsDataURL(file);
    };

    // 处理社区连线逻辑
    function initCommunityConnect() {
        document.querySelectorAll('#community-list .follow-btn').forEach(btn => {
            btn.onclick = () => {
                const card = btn.closest('.community-card');
                const name = card.querySelector('.user-name').childNodes[0].textContent.trim();
                const avatar = card.querySelector('.user-avatar').textContent;
                const tag = card.querySelector('.tag').textContent;
                const status = card.querySelector('.user-status').textContent;
                
                const persona = `你是一个${tag}领域的学习搭子，目前${status}。你的性格非常积极向上。`;
                
                saveCharacterToDB({
                    name: name,
                    persona: persona,
                    avatar: avatar,
                    date: new Date().toLocaleDateString()
                }).then(() => {
                    renderCharacterList();
                    btn.textContent = '已连线';
                    btn.disabled = true;
                    btn.style.background = '#ccc';
                    alert(`已成功连线搭子：${name}，快去“我的搭子”里找它聊天吧！`);
                });
            };
        });
    }

    async function renderCharacterList() {
        const characters = await loadCharactersFromDB();
        
        if (characters.length === 0) {
            characterListContainer.style.display = 'none';
            charactersEmpty.style.display = 'flex';
            return;
        }

        characterListContainer.style.display = 'flex';
        charactersEmpty.style.display = 'none';
        characterListContainer.innerHTML = '';

        characters.forEach(char => {
            const card = document.createElement('div');
            card.className = 'community-card';
            
            let avatarHtml = char.avatar && char.avatar.startsWith('data:image') 
                ? `<img src="${char.avatar}" alt="avatar">` 
                : (char.avatar || '🤖');

            card.innerHTML = `
                <div class="user-avatar" title="点击更换头像">${avatarHtml}</div>
                <div class="user-info">
                    <div class="user-name">${char.name} <span class="tag">AI 搭子</span></div>
                </div>
                <div style="display:flex; gap:8px; flex-wrap: wrap; justify-content: flex-end;">
                    <button class="follow-btn chat-btn">聊天</button>
                    <button class="follow-btn edit-persona-btn" style="background:#5AC8FA;">人设</button>
                    <button class="follow-btn delete-char-btn" style="background:#FF3B30;">删除</button>
                </div>
            `;

            card.querySelector('.user-avatar').onclick = () => {
                currentChatCharacter = char;
                avatarInput.click();
            };

            card.querySelector('.chat-btn').onclick = () => openChat(char);
            card.querySelector('.edit-persona-btn').onclick = () => {
                // 使用自定义弹窗以支持更大的编辑区域
                const overlay = document.createElement('div');
                overlay.className = 'modal-overlay';
                overlay.style.display = 'flex';
                overlay.innerHTML = `
                    <div class="modal-content persona-modal-content">
                        <h3 class="modal-title">编辑角色人设</h3>
                        <textarea class="edit-area" id="edit-persona-text">${char.persona}</textarea>
                        <div class="edit-actions">
                            <button class="primary-btn" id="save-persona-btn">保存</button>
                            <button class="secondary-btn" id="cancel-persona-btn">取消</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);

                overlay.querySelector('#save-persona-btn').onclick = () => {
                    const newPersona = overlay.querySelector('#edit-persona-text').value.trim();
                    if (newPersona) {
                        char.persona = newPersona;
                        saveCharacterToDB(char).then(() => {
                            renderCharacterList();
                            document.body.removeChild(overlay);
                        });
                    }
                };
                overlay.querySelector('#cancel-persona-btn').onclick = () => {
                    document.body.removeChild(overlay);
                };
            };
            card.querySelector('.delete-char-btn').onclick = () => {
                if (confirm(`确定要删除搭子 ${char.name} 吗？`)) {
                    deleteCharacterFromDB(char.id).then(() => renderCharacterList());
                }
            };

            characterListContainer.appendChild(card);
        });
    }

    async function openChat(character) {
        currentChatCharacter = character;
        chatCharacterName.textContent = character.name;
        chatMessages.innerHTML = '';
        
        try {
            const history = await loadChatMessagesFromDB(character.id);
            if (!history || history.length === 0) {
                // 初始欢迎语
                const welcomeMsg = {
                    charId: character.id,
                    role: 'ai',
                    text: `你好！我是你的学习搭子 ${character.name}。今天准备背诵点什么？`,
                    date: new Date().getTime()
                };
                addMessage('ai', welcomeMsg.text);
                saveChatMessageToDB(welcomeMsg);
            } else {
                // 按时间排序确保顺序正确
                history.sort((a, b) => a.date - b.date).forEach(msg => addMessage(msg.role, msg.text, false));
            }
        } catch (err) {
            console.error("加载聊天记录失败:", err);
            addMessage('ai', "加载历史记录时出错了，但我们可以开始新的对话。");
        }
        
        chatViewer.style.display = 'flex';
        // 多次尝试滚动以确保在图片或复杂布局渲染后到达底部
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 50);
        requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }

    closeChat.onclick = () => {
        chatViewer.style.display = 'none';
        currentChatCharacter = null;
    };

    btnClearChat.onclick = () => {
        if (!currentChatCharacter) return;
        if (confirm(`确定要清空与 ${currentChatCharacter.name} 的聊天记录吗？`)) {
            clearChatMessagesFromDB(currentChatCharacter.id).then(() => {
                chatMessages.innerHTML = '';
                const welcomeMsg = {
                    charId: currentChatCharacter.id,
                    role: 'ai',
                    text: `记录已清空。我是你的学习搭子 ${currentChatCharacter.name}，我们重新开始吧！`,
                    date: new Date().getTime()
                };
                addMessage('ai', welcomeMsg.text);
                saveChatMessageToDB(welcomeMsg);
            });
        }
    };

    function addMessage(role, text, scroll = true) {
        const msg = document.createElement('div');
        msg.className = `message ${role}`;
        msg.textContent = text;
        chatMessages.appendChild(msg);
        if (scroll) {
            requestAnimationFrame(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            });
        }
    }

    btnSendChat.onclick = sendMessage;
    btnAiReply.onclick = () => sendMessage(true);
    chatInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };

    async function sendMessage(isAiTriggered = false) {
        const text = chatInput.value.trim();
        if (!currentChatCharacter) return;
        
        // 逻辑：如果有输入文字，无论是否点击信封，都先作为用户消息处理
        if (text) {
            addMessage('user', text);
            await saveChatMessageToDB({
                charId: currentChatCharacter.id,
                role: 'user',
                text: text,
                date: new Date().getTime()
            });
            chatInput.value = '';
        } else if (!isAiTriggered) {
            // 没有文字且不是手动触发 AI，则不执行
            return;
        }

        const config = JSON.parse(localStorage.getItem('apiConfig'));
        if (!config || !config.url || !config.key) {
            if (!text && isAiTriggered) {
                addMessage('ai', '请先在设置中配置 AI API，我才能和你聊天哦。');
            }
            return;
        }

        // 显示加载状态
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'message ai loading';
        loadingMsg.textContent = '正在思考...';
        chatMessages.appendChild(loadingMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            // 获取历史记录作为上下文
            const history = await loadChatMessagesFromDB(currentChatCharacter.id);
            // 取最近的 15 条消息以获得更丰富的上下文
            const recentHistory = history.slice(-15);
            
            let actionInstruction = isActionEnabled 
                ? "【风格要求】在回复中加入生动的动作描写和神态描写（必须用括号包裹，例如：(微微一笑，推了推眼镜)），增加代入感。" 
                : "【绝对禁令：严禁描写】\n1. 严禁输出任何括号 ()、[]、{} 及其中的内容。\n2. 严禁输出任何动作描写、神态描写或心理描写。\n3. 严禁使用 *星号* 包裹的动作。\n4. 你的回复中【禁止出现任何括号字符】。如果你想表达情绪，请通过文字语气表达，而不是描写动作。";

            const systemPrompt = `你现在的身份是：${currentChatCharacter.persona}。你的名字叫${currentChatCharacter.name}。
            你正在与用户进行【纯文字】线上聊天。
            
            ${actionInstruction}
            
            【回复规范】
            - 仅输出对话台词，严禁任何旁白。
            - 每次回复必须严格保持在 3 到 5 个句子之间。
            - 模拟真实人类在微信/QQ上的聊天习惯，直接、自然。
            
            【错误示例】(❌禁止出现): 刚才在忙呢 (抬头看了一眼窗外) 你怎么突然找我了？
            【正确示例】(✅必须这样): 刚才在忙呢，正处理一些文件。你怎么突然找我了？是不是遇到什么难题了？`;

            const apiMessages = [
                { role: 'system', content: systemPrompt }
            ];

            recentHistory.forEach(msg => {
                apiMessages.push({
                    role: msg.role === 'ai' ? 'assistant' : 'user',
                    content: msg.text
                });
            });

            const response = await fetch(`${config.url}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: apiMessages,
                    temperature: 0.7
                })
            });

            chatMessages.removeChild(loadingMsg);

            if (!response.ok) throw new Error('AI 响应失败');
            const data = await response.json();
            const aiReplyRaw = data.choices[0].message.content;
            
            // 兜底过滤：如果动描关闭，物理移除所有括号及其内容
            let aiReply = aiReplyRaw;
            if (!isActionEnabled) {
                let previousReply;
                // 循环过滤以处理嵌套括号情况
                do {
                    previousReply = aiReply;
                    // 移除所有成对的括号及其内容 (支持中英文、方括号、花括号)
                    // 使用更严谨的排除型正则，防止跨行匹配错误
                    aiReply = aiReply.replace(/[\(\（\[【\{][^\(\（\[【\{\)\）\]】\}]*?[\)\）\]】\}]/g, '');
                } while (aiReply !== previousReply);

                // 移除所有星号包裹的内容 (常见的动作描写方式)
                aiReply = aiReply.replace(/\*.*?\*/g, '');
                // 移除任何残留的孤立括号字符
                aiReply = aiReply.replace(/[\(\（\[【\{\)\）\]】\}]/g, '');
                // 清理多余空格、换行及连续标点
                aiReply = aiReply.replace(/\s+/g, ' ').replace(/([。！？，])\1+/g, '$1').trim();
                
                // 如果过滤后变为空（极端情况），则保留原样
                if (!aiReply || aiReply.length < 2) aiReply = aiReplyRaw.replace(/[\(\（\[【\{\)\）\]】\}]/g, '');
            }
            
            addMessage('ai', aiReply);
            await saveChatMessageToDB({
                charId: currentChatCharacter.id,
                role: 'ai',
                text: aiReply,
                date: new Date().getTime()
            });
        } catch (error) {
            if (chatMessages.contains(loadingMsg)) chatMessages.removeChild(loadingMsg);
            addMessage('ai', '抱歉，我刚才走神了，请再说一遍？(错误: ' + error.message + ')');
        }
    }

    // --- 4. AI API 配置逻辑 ---
    const apiUrlInput = document.getElementById('api-url');
    const apiKeyInput = document.getElementById('api-key');
    const apiModelSelect = document.getElementById('api-model');
    const fetchModelsBtn = document.getElementById('fetch-models-btn');
    const saveApiBtn = document.getElementById('save-api-btn');

    const savedApiConfig = JSON.parse(localStorage.getItem('apiConfig')) || {};
    if (savedApiConfig.url) apiUrlInput.value = savedApiConfig.url;
    if (savedApiConfig.key) apiKeyInput.value = savedApiConfig.key;
    if (savedApiConfig.model) {
        const opt = document.createElement('option');
        opt.value = savedApiConfig.model;
        opt.textContent = savedApiConfig.model;
        opt.selected = true;
        apiModelSelect.appendChild(opt);
    }

    fetchModelsBtn.addEventListener('click', async () => {
        const url = apiUrlInput.value.trim();
        const key = apiKeyInput.value.trim();
        if (!url || !key) { alert('请先输入 API URL 和 Key'); return; }
        fetchModelsBtn.disabled = true;
        fetchModelsBtn.textContent = '获取中...';
        try {
            const response = await fetch(`${url}/models`, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' } });
            if (!response.ok) throw new Error('请求失败');
            const data = await response.json();
            apiModelSelect.innerHTML = '';
            if (data.data && Array.isArray(data.data)) {
                data.data.forEach(model => {
                    const opt = document.createElement('option');
                    opt.value = model.id;
                    opt.textContent = model.id;
                    apiModelSelect.appendChild(opt);
                });
                alert('模型列表获取成功！');
            }
        } catch (error) { alert('错误: ' + error.message); }
        finally { fetchModelsBtn.disabled = false; fetchModelsBtn.textContent = '获取列表'; }
    });

    saveApiBtn.addEventListener('click', () => {
        const config = { url: apiUrlInput.value.trim(), key: apiKeyInput.value.trim(), model: apiModelSelect.value };
        if (!config.url || !config.key) { alert('填写完整的 API 信息'); return; }
        localStorage.setItem('apiConfig', JSON.stringify(config));
        alert('配置已保存！');
    });

    // --- 数据导入导出逻辑 ---
    const btnExportData = document.getElementById('btn-export-data');
    const btnImportData = document.getElementById('btn-import-data');
    const importDbInput = document.getElementById('import-db-input');

    btnExportData.onclick = async () => {
        const data = {
            files: await loadFilesFromDB(),
            flashcards: await loadFlashcardsFromDB(),
            mistakes: await loadMistakesFromDB(),
            mistakeBooks: await loadMistakeBooksFromDB(),
            characters: await loadCharactersFromDB(),
            apiConfig: JSON.parse(localStorage.getItem('apiConfig')) || {},
            fabPosition: JSON.parse(localStorage.getItem('fabPosition')) || null
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backbook_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    btnImportData.onclick = () => importDbInput.click();

    importDbInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (confirm('导入将覆盖当前所有数据，确定继续吗？')) {
                    // 清空并写入 IndexedDB
                    const stores = [storeName, flashcardStoreName, mistakeStoreName, mistakeBookStoreName, characterStoreName, chatMessageStoreName];
                    const transaction = db.transaction(stores, "readwrite");
                    
                    stores.forEach(s => transaction.objectStore(s).clear());
                    
                    if (data.files) data.files.forEach(f => transaction.objectStore(storeName).put(f));
                    if (data.flashcards) data.flashcards.forEach(f => transaction.objectStore(flashcardStoreName).put(f));
                    if (data.mistakes) data.mistakes.forEach(m => transaction.objectStore(mistakeStoreName).put(m));
                    if (data.mistakeBooks) data.mistakeBooks.forEach(b => transaction.objectStore(mistakeBookStoreName).put(b));
                    if (data.characters) data.characters.forEach(c => transaction.objectStore(characterStoreName).put(c));

                    transaction.oncomplete = () => {
                        if (data.apiConfig) localStorage.setItem('apiConfig', JSON.stringify(data.apiConfig));
                        if (data.fabPosition) localStorage.setItem('fabPosition', JSON.stringify(data.fabPosition));
                        alert('数据导入成功，页面即将刷新！');
                        location.reload();
                    };
                }
            } catch (err) {
                alert('导入失败，文件格式可能不正确: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
});
