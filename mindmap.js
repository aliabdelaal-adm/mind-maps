// Load data and initialize mind map
let data = null;
let nodes = [];
let canvas, ctx;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Modal elements
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalType = document.getElementById('modal-type');
const modalDescription = document.getElementById('modal-description');
const modalLinks = document.getElementById('modal-links');
const closeBtn = document.getElementsByClassName('close')[0];

// Close modal when clicking on X
closeBtn.onclick = function() {
    modal.style.display = 'none';
};

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};

// Initialize canvas
function initCanvas() {
    canvas = document.getElementById('mindmap');
    const container = document.getElementById('mindmap-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    ctx = canvas.getContext('2d');
    
    // Set up event listeners
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    canvas.addEventListener('mouseup', handleCanvasMouseUp);
    canvas.addEventListener('wheel', handleCanvasWheel);
}

// Load data from JSON file
fetch('data.json')
    .then(response => response.json())
    .then(jsonData => {
        data = jsonData;
        initCanvas();
        createMindMap(data);
    })
    .catch(error => {
        console.error('Error loading data:', error);
        alert('خطأ في تحميل البيانات. الرجاء التحقق من ملف data.json');
    });

function createMindMap(data) {
    // Set up dimensions
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Group works by category
    const categoriesMap = {};
    data.works.forEach(work => {
        if (!categoriesMap[work.category]) {
            categoriesMap[work.category] = [];
        }
        categoriesMap[work.category].push(work);
    });

    const categories = Object.keys(categoriesMap);
    
    // Create nodes and links
    nodes = [];
    const links = [];

    // Center node
    const centerNode = {
        id: 'center',
        label: 'الأعمال',
        type: 'center',
        x: centerX,
        y: centerY,
        radius: 60
    };
    nodes.push(centerNode);

    // Category nodes and work nodes
    const categoryRadius = Math.min(width, height) * 0.3;
    const angleStep = (2 * Math.PI) / categories.length;

    categories.forEach((category, catIndex) => {
        const categoryAngle = angleStep * catIndex;
        const categoryNode = {
            id: `cat-${catIndex}`,
            label: category,
            type: 'category',
            x: centerX + categoryRadius * Math.cos(categoryAngle),
            y: centerY + categoryRadius * Math.sin(categoryAngle),
            radius: 50
        };
        nodes.push(categoryNode);
        
        // Link from center to category
        links.push({
            source: centerNode,
            target: categoryNode,
            type: 'category-link'
        });

        // Work nodes for this category
        const works = categoriesMap[category];
        const workRadius = 120;
        const workAngleStep = (Math.PI / 2) / (works.length + 1);

        works.forEach((work, workIndex) => {
            const workAngle = categoryAngle + workAngleStep * (workIndex + 1) - Math.PI / 4;
            const workNode = {
                id: `work-${work.id}`,
                label: work.title,
                type: 'work',
                x: categoryNode.x + workRadius * Math.cos(workAngle),
                y: categoryNode.y + workRadius * Math.sin(workAngle),
                radius: 35,
                data: work
            };
            nodes.push(workNode);
            
            // Link from category to work
            links.push({
                source: categoryNode,
                target: workNode,
                type: 'work-link'
            });
        });
    });

    // Draw the mind map
    drawMindMap(links);
}

function drawMindMap(links) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context state
    ctx.save();
    
    // Apply transformations
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    
    // Draw links first
    links.forEach(link => {
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.strokeStyle = link.type === 'category-link' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = link.type === 'category-link' ? 3 : 2;
        ctx.stroke();
    });
    
    // Draw nodes
    nodes.forEach(node => {
        // Draw circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        
        // Set color based on type
        if (node.type === 'center') {
            ctx.fillStyle = '#667eea';
        } else if (node.type === 'category') {
            ctx.fillStyle = '#764ba2';
        } else {
            ctx.fillStyle = '#f093fb';
        }
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw text
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        if (node.type === 'center') {
            ctx.font = 'bold 16px Arial';
        } else if (node.type === 'category') {
            ctx.font = 'bold 14px Arial';
        } else {
            ctx.font = 'bold 12px Arial';
        }
        
        // Wrap text for work nodes
        const lines = wrapText(node.label, node.radius * 1.8, parseInt(ctx.font));
        const lineHeight = parseInt(ctx.font) + 4;
        const startY = node.y - ((lines.length - 1) * lineHeight) / 2;
        
        lines.forEach((line, i) => {
            ctx.fillText(line, node.x, startY + i * lineHeight);
        });
        
        ctx.shadowColor = 'transparent';
    });
    
    // Restore context state
    ctx.restore();
}

function wrapText(text, maxWidth, fontSize) {
    // Simple text wrapping function
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    // Approximate character width (adjust based on font)
    const charWidth = fontSize * 0.6;
    const maxChars = Math.floor(maxWidth / charWidth);
    
    words.forEach(word => {
        if ((currentLine + ' ' + word).length <= maxChars) {
            currentLine = currentLine ? currentLine + ' ' + word : word;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    });
    
    if (currentLine) lines.push(currentLine);
    
    // Limit to 3 lines for work nodes
    return lines.slice(0, 3);
}

function handleCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - offsetX) / scale;
    const y = (event.clientY - rect.top - offsetY) / scale;
    
    // Check which node was clicked
    for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
        
        if (distance <= node.radius) {
            if (node.type === 'work' && node.data) {
                // Show modal with work details
                modalTitle.textContent = node.data.title;
                modalType.textContent = `النوع: ${node.data.type}`;
                modalDescription.textContent = node.data.description || '';
                
                // Clear previous links
                modalLinks.innerHTML = '';
                
                // Add download links
                if (node.data.downloadLinks) {
                    if (node.data.downloadLinks.pdf) {
                        const pdfLink = document.createElement('a');
                        pdfLink.href = node.data.downloadLinks.pdf;
                        pdfLink.className = 'download-link';
                        pdfLink.target = '_blank';
                        pdfLink.textContent = 'تحميل PDF';
                        modalLinks.appendChild(pdfLink);
                    }
                    
                    if (node.data.downloadLinks.word) {
                        const wordLink = document.createElement('a');
                        wordLink.href = node.data.downloadLinks.word;
                        wordLink.className = 'download-link';
                        wordLink.target = '_blank';
                        wordLink.textContent = 'تحميل Word';
                        modalLinks.appendChild(wordLink);
                    }
                }
                
                modal.style.display = 'block';
            }
            break;
        }
    }
}

function handleCanvasMouseMove(event) {
    if (isDragging) {
        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;
        offsetX += deltaX;
        offsetY += deltaY;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        redraw();
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - offsetX) / scale;
    const y = (event.clientY - rect.top - offsetY) / scale;
    
    const tooltip = document.getElementById('tooltip');
    let hoveredNode = null;
    
    // Check which node is being hovered
    for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
        
        if (distance <= node.radius) {
            hoveredNode = node;
            break;
        }
    }
    
    if (hoveredNode) {
        canvas.style.cursor = 'pointer';
        
        if (hoveredNode.type === 'work' && hoveredNode.data) {
            tooltip.innerHTML = `
                <strong>${hoveredNode.data.title}</strong><br>
                النوع: ${hoveredNode.data.type}<br>
                القسم: ${hoveredNode.data.category}
            `;
        } else if (hoveredNode.type === 'category') {
            tooltip.innerHTML = `<strong>${hoveredNode.label}</strong>`;
        } else {
            tooltip.innerHTML = `<strong>${hoveredNode.label}</strong>`;
        }
        
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY + 10) + 'px';
        tooltip.classList.add('show');
    } else {
        canvas.style.cursor = 'default';
        tooltip.classList.remove('show');
    }
}

function handleCanvasMouseDown(event) {
    isDragging = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    canvas.style.cursor = 'grabbing';
}

function handleCanvasMouseUp() {
    isDragging = false;
    canvas.style.cursor = 'default';
}

function handleCanvasWheel(event) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    scale *= delta;
    scale = Math.max(0.5, Math.min(3, scale));
    redraw();
}

function redraw() {
    if (data) {
        createMindMap(data);
    }
}

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (data && canvas) {
            const container = document.getElementById('mindmap-container');
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            scale = 1;
            offsetX = 0;
            offsetY = 0;
            createMindMap(data);
        }
    }, 250);
});
