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
    let db;

    const initDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 4);
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
        } else {
            fileInput.click();
        }
    });

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

    document.getElementById('btn-ai-cloze').onclick = async () => {
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
            // 使用 innerHTML 以保留图片占位，但同样使用占位符防止 base64 干扰
            let rawHTML = viewerBody.innerHTML;
            const images = [];
            const placeholderHTML = rawHTML.replace(/<img [^>]*src=['"]([^'"]+)['"][^>]*>/g, (match) => {
                images.push(match);
                return `[[IMG_${images.length - 1}]]`;
            });

            const prompt = `你是一个背书助手。请分析以下内容，找出其中需要背诵的关键知识点，并将其用 {{内容}} 的格式包裹起来。
            要求：
            1. 必须保留所有的 [[IMG_N]] 占位符且位置不变。
            2. 必须包含原文的【全部内容】，严禁删减或概括。
            3. 不要改变原文内容，只是将重点词汇或短语用双大括号包裹。
            4. 保持 HTML 结构完整。
            5. 只返回处理后的内容。
            
            内容：
            ${placeholderHTML.substring(0, 15000)}`;

            const response = await fetch(`${config.url}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7
                })
            });

            if (!response.ok) throw new Error('AI 请求失败');
            const data = await response.json();
            let aiResult = data.choices[0].message.content;

            // 还原图片
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
    };

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

    btnRegenMindmap.onclick = async () => {
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
            const prompt = `请根据以下材料，生成一个思维导图的 HTML 结构。
            要求：
            1. 使用 <ul> 和 <li> 嵌套结构。
            2. 根节点是文件名：${currentOpenFile.name}。
            3. 提取核心概念、分支和细节。
            4. 样式简洁，只返回 <ul> 及其内部内容。
            5. 每个 <li> 的文本内容必须包裹在 <span> 标签中，例如：<li><span>核心概念</span><ul>...</ul></li>。
            
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
                    temperature: 0.7
                })
            });

            if (!response.ok) throw new Error('AI 请求失败');
            const data = await response.json();
            const aiResult = data.choices[0].message.content;
            
            const htmlMatch = aiResult.match(/<ul[\s\S]*<\/ul>/);
            let finalHtml = htmlMatch ? htmlMatch[0] : `<ul><li><span>${aiResult}</span></li></ul>`;
            
            // 兜底处理：如果 AI 没加 span，我们尝试补上
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
    };

    // AI 朗读功能
    let synth = window.speechSynthesis;
    let utterance = null;

    document.getElementById('btn-read').onclick = () => {
        if (!currentOpenFile || currentOpenFile.type === 'image') return;
        
        if (synth.speaking) {
            synth.cancel();
            return;
        }

        let textToRead = "";
        const isChapter = currentOpenFile.currentChapterIndex !== null && currentOpenFile.currentChapterIndex !== undefined;
        
        if (isChapter) {
            const ch = currentOpenFile.chapters[currentOpenFile.currentChapterIndex];
            textToRead = ch.clozeContent ? ch.clozeContent : viewerBody.innerHTML;
        } else {
            textToRead = currentOpenFile.clozeContent ? currentOpenFile.clozeContent : viewerBody.innerHTML;
        }

        // 1. 移除挖空标记，保留内容
        textToRead = textToRead.replace(/\{\{(.*?)\}\}/g, '$1');
        // 2. 移除所有 HTML 标签
        textToRead = textToRead.replace(/<[^>]+>/g, ' ');
        // 3. 移除图片占位符文本，防止读出“方括号”
        textToRead = textToRead.replace(/\[\[IMG_\d+\]\]/g, '');
        textToRead = textToRead.replace(/\[\[IMAGE_PLACEHOLDER_\d+\]\]/g, '');
        // 4. 清理多余空格和换行
        textToRead = textToRead.replace(/\s+/g, ' ').trim();

        if (!textToRead) {
            alert('没有可朗读的文本内容');
            return;
        }

        utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'zh-CN';
        utterance.rate = 1.0;
        
        const btn = document.getElementById('btn-read');
        const originalHTML = btn.innerHTML;
        
        utterance.onstart = () => {
            btn.innerHTML = '<div class="action-icon">⏹️</div><span>停止</span>';
            btn.classList.add('active');
        };
        
        utterance.onend = () => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('active');
        };

        synth.speak(utterance);
    };

    // AI 出题功能
    const quizViewer = document.getElementById('quiz-viewer');
    const quizDisplayBody = document.getElementById('quiz-display-body');
    const quizTypeTitle = document.getElementById('quiz-type-title');
    const closeQuiz = document.getElementById('close-quiz');

    closeQuiz.onclick = () => {
        quizViewer.style.display = 'none';
    };

    document.getElementById('btn-quiz').onclick = () => {
        if (!currentOpenFile || currentOpenFile.type === 'image') {
            alert('当前文件类型不支持出题');
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

            const prompt = `你是一个老师。请根据以下学习材料，出 ${count} 道练习题（单选题或填空题）。
            请严格按照以下 JSON 格式返回，不要有任何其他文字：
            [
              {
                "type": "选择题",
                "question": "题目内容",
                "options": ["选项A", "选项B", "选项C", "选项D"],
                "answer": "正确答案"
              },
              {
                "type": "填空题",
                "question": "题目内容，挖空处用 ___ 表示",
                "answer": "正确答案"
              }
            ]
            
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
                    temperature: 0.7
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
    document.getElementById('btn-divide-chapters').onclick = async () => {
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
            // 始终从原始完整内容开始划分，确保不丢失图片和内容
            let rawHTML = currentOpenFile.content;
            
            // 1. 提取并替换图片占位符，防止 base64 撑爆上下文导致图片丢失
            const images = [];
            const placeholderHTML = rawHTML.replace(/<img [^>]*src=['"]([^'"]+)['"][^>]*>/g, (match) => {
                images.push(match);
                return `[[IMG_${images.length - 1}]]`;
            });

            const prompt = `你是一个文档整理专家。请将以下内容划分为多个章节。
            要求：
            1. 必须保留所有的 [[IMG_N]] 占位符，且位置必须与原文逻辑一致。
            2. 必须包含原文的【全部内容】，严禁删减或概括。
            3. 如果原文中有明显的章节标题（如“第一章”、“一、”等），请务必按原标题拆分。
            4. 如果没有明显标题，请按内容逻辑强行划分为 5-10 个章节，确保每个章节长度适中。
            5. 严格按以下 JSON 格式返回，不要包含任何 Markdown 代码块标记：
            [
              {"title": "章节标题", "content": "该章节的完整内容（含 HTML 标签和占位符）"},
              ...
            ]
            
            内容：
            ${placeholderHTML.substring(0, 20000)}`;

            const response = await fetch(`${config.url}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3
                })
            });

            if (!response.ok) throw new Error('AI 请求失败');
            const data = await response.json();
            const aiContent = data.choices[0].message.content.trim();
            const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
            let chapters = JSON.parse(jsonMatch ? jsonMatch[0] : aiContent);

            // 2. 还原图片：将占位符替换回原始的 <img> 标签
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
    };

    function renderChapterList() {
        chapterList.innerHTML = '';
        
        const allItem = document.createElement('div');
        allItem.className = 'chapter-item active';
        allItem.textContent = '显示全篇';
        allItem.onclick = () => {
            currentOpenFile.currentChapterIndex = null;
            renderOriginalContent(currentOpenFile);
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
        showModal('选择生成范围', [
            { label: '全篇内容', value: 'all' },
            { label: '前 2000 字', value: 'limit' }
        ], (range) => {
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
            let textToAnalyze = file.type === 'docx' ? file.content.replace(/<[^>]+>/g, '') : file.content;
            textToAnalyze = textToAnalyze.substring(0, range === 'limit' ? 2000 : 6000);

            const prompt = `请根据以下材料，制作 5-8 张闪卡。每张闪卡包含“正面”（问题或概念）和“反面”（答案或解释）。
            请严格按照以下 JSON 格式返回，不要包含任何 Markdown 标记：
            [
              {"front": "正面内容", "back": "反面内容"},
              ...
            ]
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
                    temperature: 0.7
                })
            });

            if (!response.ok) throw new Error('AI 请求失败');
            const data = await response.json();
            const content = data.choices[0].message.content.trim();
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            const cards = JSON.parse(jsonMatch ? jsonMatch[0] : content);

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
            item.innerHTML = `
                <div class="card-box-delete" onclick="event.stopPropagation(); deleteFlashcardBox(${box.fileId})">×</div>
                <div class="box-icon">📦</div>
                <div class="box-name">${box.fileName}</div>
                <div class="box-count">${box.cards.length} 张闪卡</div>
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

    let currentSessionCards = [];
    let currentCardIndex = 0;

    function startFlashcardSession(box) {
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
    }

    cardFlipMain.onclick = () => {
        cardFlipMain.classList.toggle('flipped');
    };

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

    document.getElementById('btn-clear-mistakes').onclick = () => {
        if (confirm('确定要清空所有错题吗？')) {
            const transaction = db.transaction([mistakeStoreName], "readwrite");
            transaction.objectStore(mistakeStoreName).clear().onsuccess = () => renderMistakes();
        }
    };

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
        if (!config.url || !config.key) { alert('请填写完整的 API 信息'); return; }
        localStorage.setItem('apiConfig', JSON.stringify(config));
        alert('配置已保存！');
    });
});
