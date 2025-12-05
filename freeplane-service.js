// Freeplane Hybrid Smart Mind Map Service
// This service provides Freeplane-compatible features and intelligent mind mapping capabilities
// Merges the power of Freeplane with our interactive mind map platform

class FreeplaneService {
    constructor() {
        // Freeplane-inspired configuration
        this.config = {
            version: '1.0.0',
            freeplaneVersion: '1.11.x', // Compatible Freeplane version
            defaultNodeStyle: 'bubble',
            smartFeatures: {
                autoLayout: true,
                intelligentConnections: true,
                contextualSuggestions: true,
                nodeTemplates: true,
                iconLibrary: true
            }
        };
        
        // Icon library inspired by Freeplane
        this.iconLibrary = {
            priority: ['🔴', '🟠', '🟡', '🟢', '🔵'],
            status: ['✅', '⏳', '❌', '⏸️', '🔄'],
            category: ['📁', '📊', '📈', '📋', '📝'],
            idea: ['💡', '🧠', '✨', '🎯', '🚀'],
            warning: ['⚠️', '⛔', '🔔', '📢', '❗'],
            collaboration: ['👥', '🤝', '💬', '📧', '🔗']
        };
        
        // Smart templates inspired by Freeplane
        this.nodeTemplates = {
            goal: { icon: '🎯', color: '#4CAF50', style: 'rectangle' },
            task: { icon: '📋', color: '#2196F3', style: 'bubble' },
            idea: { icon: '💡', color: '#FFC107', style: 'oval' },
            risk: { icon: '⚠️', color: '#f44336', style: 'diamond' },
            milestone: { icon: '🏁', color: '#9C27B0', style: 'rectangle' },
            resource: { icon: '📦', color: '#00BCD4', style: 'bubble' },
            decision: { icon: '🔀', color: '#FF9800', style: 'diamond' }
        };
    }

    /**
     * Parse Freeplane .mm XML format
     * @param {string} xmlContent - Freeplane XML content
     * @returns {Object} - Parsed mind map data
     */
    parseFreeplaneFormat(xmlContent) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
            
            const mapNode = xmlDoc.querySelector('map');
            if (!mapNode) {
                throw new Error('Invalid Freeplane format');
            }
            
            const rootNode = mapNode.querySelector('node');
            if (!rootNode) {
                throw new Error('No root node found');
            }
            
            const works = [];
            let idCounter = 1;
            
            this.parseNode(rootNode, works, null, idCounter);
            
            return {
                works: works,
                metadata: {
                    importedFrom: 'Freeplane',
                    version: mapNode.getAttribute('version') || '1.0',
                    importDate: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Freeplane parsing error:', error);
            throw new Error('فشل في قراءة ملف Freeplane');
        }
    }

    /**
     * Recursively parse Freeplane nodes
     */
    parseNode(node, works, parentCategory, startId) {
        const text = node.getAttribute('TEXT') || node.querySelector('richcontent')?.textContent || 'عقدة';
        const id = node.getAttribute('ID') || startId;
        
        // Determine category from parent or position
        const category = parentCategory || this.inferCategory(text);
        
        // Check for icons and styles
        const icons = node.querySelectorAll('icon');
        const iconNames = Array.from(icons).map(i => i.getAttribute('BUILTIN'));
        
        // Extract edge color if available
        const edge = node.querySelector('edge');
        const edgeColor = edge?.getAttribute('COLOR') || null;
        
        // Create work item
        const workItem = {
            id: parseInt(id) || works.length + 1,
            title: text.trim(),
            type: this.inferType(text, iconNames),
            category: category,
            description: this.generateSmartDescription(text),
            downloadLinks: {},
            freeplaneData: {
                icons: iconNames,
                color: edgeColor,
                position: node.getAttribute('POSITION'),
                folded: node.getAttribute('FOLDED') === 'true'
            },
            aiGenerated: false,
            smartFeatures: {
                autoConnections: [],
                suggestions: [],
                priority: this.calculatePriority(iconNames)
            }
        };
        
        works.push(workItem);
        
        // Process child nodes
        const childNodes = node.querySelectorAll(':scope > node');
        childNodes.forEach((child, index) => {
            this.parseNode(child, works, text, works.length + 1);
        });
    }

    /**
     * Generate Freeplane .mm XML format
     * @param {Object} mindMapData - Mind map data
     * @returns {string} - Freeplane XML content
     */
    generateFreeplaneFormat(mindMapData) {
        const categoriesMap = {};
        mindMapData.works.forEach(work => {
            if (!categoriesMap[work.category]) {
                categoriesMap[work.category] = [];
            }
            categoriesMap[work.category].push(work);
        });
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<map version="freeplane 1.11.1">\n';
        xml += '<!-- Exported from Smart Hybrid Mind Map Platform -->\n';
        xml += `<node TEXT="الخريطة الذهنية الذكية" FOLDED="false" ID="ID_root" COLOR="#000000">\n`;
        
        Object.keys(categoriesMap).forEach((category, catIndex) => {
            const position = catIndex % 2 === 0 ? 'right' : 'left';
            xml += `  <node TEXT="${this.escapeXml(category)}" POSITION="${position}" ID="ID_cat_${catIndex}" COLOR="#764ba2">\n`;
            xml += `    <edge COLOR="#764ba2"/>\n`;
            
            categoriesMap[category].forEach((work, workIndex) => {
                xml += `    <node TEXT="${this.escapeXml(work.title)}" ID="ID_work_${work.id}" COLOR="#f093fb">\n`;
                xml += `      <edge COLOR="#f093fb"/>\n`;
                
                if (work.description) {
                    xml += `      <richcontent TYPE="NOTE">\n`;
                    xml += `        <html><body><p>${this.escapeXml(work.description)}</p></body></html>\n`;
                    xml += `      </richcontent>\n`;
                }
                
                // Add icons based on type
                const iconName = this.getFreeplaneIcon(work.type);
                if (iconName) {
                    xml += `      <icon BUILTIN="${iconName}"/>\n`;
                }
                
                xml += `    </node>\n`;
            });
            
            xml += `  </node>\n`;
        });
        
        xml += '</node>\n';
        xml += '</map>\n';
        
        return xml;
    }

    /**
     * Escape XML special characters
     */
    escapeXml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Get Freeplane icon name from work type
     */
    getFreeplaneIcon(type) {
        const iconMap = {
            'هدف': 'yes',
            'خطة': 'list',
            'مورد': 'attach',
            'تحدي': 'messagebox_warning',
            'متابعة': 'clock',
            'فكرة': 'idea',
            'مبادرة': 'bookmark',
            'فريق': 'group',
            'عنصر فريق': 'male1'
        };
        return iconMap[type] || 'help';
    }

    /**
     * Infer category from text content
     */
    inferCategory(text) {
        const categoryPatterns = {
            'التخطيط': ['خطة', 'تخطيط', 'استراتيجية', 'هدف'],
            'التنفيذ': ['تنفيذ', 'عمل', 'مهمة', 'خطوة'],
            'المخاطر': ['خطر', 'تحدي', 'مشكلة', 'عقبة'],
            'الابتكار': ['ابتكار', 'فكرة', 'إبداع', 'تطوير'],
            'فريق': ['فريق', 'موظف', 'إدارة', 'قيادة'],
            'مكان': ['مكان', 'موقع', 'مقر']
        };
        
        const lowerText = text.toLowerCase();
        for (const [category, patterns] of Object.entries(categoryPatterns)) {
            if (patterns.some(pattern => lowerText.includes(pattern))) {
                return category;
            }
        }
        return 'عام';
    }

    /**
     * Infer work type from text and icons
     */
    inferType(text, icons = []) {
        if (icons.includes('yes') || icons.includes('button_ok')) return 'هدف';
        if (icons.includes('list') || icons.includes('calendar')) return 'خطة';
        if (icons.includes('messagebox_warning') || icons.includes('stop')) return 'تحدي';
        if (icons.includes('idea') || icons.includes('lightbulb')) return 'فكرة';
        if (icons.includes('group') || icons.includes('male1')) return 'عنصر فريق';
        
        const typePatterns = {
            'هدف': ['هدف', 'غاية', 'مقصد'],
            'خطة': ['خطة', 'مرحلة', 'خطوة'],
            'تحدي': ['تحدي', 'خطر', 'مشكلة'],
            'فكرة': ['فكرة', 'اقتراح', 'ابتكار'],
            'مبادرة': ['مبادرة', 'مشروع', 'برنامج'],
            'نشاط ابتكار': ['ابتكار', 'تطوير', 'تحسين'],
            'عنصر فريق': ['فريق', 'عضو', 'موظف'],
            'متطلب': ['متطلب', 'شرط', 'احتياج'],
            'مبدأ': ['مبدأ', 'قيمة', 'أساس']
        };
        
        const lowerText = text.toLowerCase();
        for (const [type, patterns] of Object.entries(typePatterns)) {
            if (patterns.some(pattern => lowerText.includes(pattern))) {
                return type;
            }
        }
        return 'عنصر';
    }

    /**
     * Generate smart description based on title
     */
    generateSmartDescription(title) {
        const descriptions = [
            `تفاصيل وشرح حول: ${title}`,
            `عنصر مهم يتعلق بـ: ${title}`,
            `جزء أساسي من الخريطة الذهنية: ${title}`
        ];
        return descriptions[Math.floor(Math.random() * descriptions.length)];
    }

    /**
     * Calculate priority based on icons
     */
    calculatePriority(icons) {
        if (icons.includes('priority-1') || icons.includes('full-1')) return 'عالية جداً';
        if (icons.includes('priority-2') || icons.includes('full-2')) return 'عالية';
        if (icons.includes('priority-3') || icons.includes('full-3')) return 'متوسطة';
        if (icons.includes('priority-4') || icons.includes('full-4')) return 'منخفضة';
        return 'عادية';
    }

    /**
     * Generate smart connections between nodes
     * @param {Array} works - Array of work items
     * @returns {Array} - Suggested connections
     */
    generateSmartConnections(works) {
        const connections = [];
        const keywords = {};
        
        // Extract keywords from each work
        works.forEach(work => {
            const words = (work.title + ' ' + (work.description || '')).split(/\s+/);
            keywords[work.id] = words.filter(w => w.length > 3);
        });
        
        // Find related nodes based on shared keywords
        works.forEach(work1 => {
            works.forEach(work2 => {
                if (work1.id !== work2.id) {
                    const shared = keywords[work1.id].filter(k => 
                        keywords[work2.id].some(k2 => k.includes(k2) || k2.includes(k))
                    );
                    
                    if (shared.length >= 2) {
                        connections.push({
                            source: work1.id,
                            target: work2.id,
                            strength: shared.length,
                            sharedKeywords: shared,
                            type: 'semantic'
                        });
                    }
                }
            });
        });
        
        return connections;
    }

    /**
     * Apply smart templates to nodes
     * @param {Object} work - Work item
     * @returns {Object} - Enhanced work with template
     */
    applySmartTemplate(work) {
        const template = this.nodeTemplates[work.type] || this.nodeTemplates.task;
        
        return {
            ...work,
            style: {
                icon: template.icon,
                backgroundColor: template.color,
                shape: template.style
            },
            smartFeatures: {
                ...work.smartFeatures,
                templateApplied: true,
                templateType: work.type
            }
        };
    }

    /**
     * Generate intelligent suggestions for the mind map
     * @param {Object} mindMapData - Current mind map data
     * @returns {Object} - Suggestions for improvement
     */
    generateIntelligentSuggestions(mindMapData) {
        const suggestions = {
            structuralImprovements: [],
            missingElements: [],
            connectionSuggestions: [],
            balanceAnalysis: {}
        };
        
        // Analyze category balance
        const categoryCount = {};
        mindMapData.works.forEach(work => {
            categoryCount[work.category] = (categoryCount[work.category] || 0) + 1;
        });
        
        const avgCount = mindMapData.works.length / Object.keys(categoryCount).length;
        
        Object.entries(categoryCount).forEach(([category, count]) => {
            if (count < avgCount * 0.5) {
                suggestions.missingElements.push({
                    category: category,
                    message: `الفئة "${category}" تحتاج إلى المزيد من العناصر`,
                    priority: 'متوسطة'
                });
            }
        });
        
        // Suggest connections
        suggestions.connectionSuggestions = this.generateSmartConnections(mindMapData.works);
        
        // Check for typical missing elements
        const hasGoals = mindMapData.works.some(w => w.type === 'هدف');
        const hasRisks = mindMapData.works.some(w => w.type === 'تحدي');
        const hasTimeline = mindMapData.works.some(w => w.type === 'متابعة');
        
        if (!hasGoals) {
            suggestions.structuralImprovements.push({
                type: 'missing_goals',
                message: 'يُنصح بإضافة أهداف واضحة للخريطة الذهنية',
                icon: '🎯'
            });
        }
        
        if (!hasRisks) {
            suggestions.structuralImprovements.push({
                type: 'missing_risks',
                message: 'يُنصح بإضافة قسم للتحديات والمخاطر المحتملة',
                icon: '⚠️'
            });
        }
        
        if (!hasTimeline) {
            suggestions.structuralImprovements.push({
                type: 'missing_timeline',
                message: 'يُنصح بإضافة خطة متابعة وجدول زمني',
                icon: '📅'
            });
        }
        
        suggestions.balanceAnalysis = {
            categoryDistribution: categoryCount,
            totalNodes: mindMapData.works.length,
            averageNodesPerCategory: avgCount.toFixed(1),
            isBalanced: Object.values(categoryCount).every(c => c >= avgCount * 0.5 && c <= avgCount * 1.5)
        };
        
        return suggestions;
    }

    /**
     * Create a sample Freeplane-enhanced mind map
     * @returns {Object} - Complete mind map with Freeplane features
     */
    createHybridMindMap() {
        return {
            works: [
                {
                    id: 1,
                    title: "الرؤية الاستراتيجية",
                    type: "هدف",
                    category: "التخطيط الذكي",
                    description: "تحديد الرؤية الشاملة والأهداف الاستراتيجية باستخدام تقنيات الخرائط الذهنية المتقدمة",
                    downloadLinks: {},
                    aiGenerated: true,
                    freeplaneEnhanced: true,
                    smartFeatures: {
                        priority: "عالية جداً",
                        autoConnections: [2, 3, 4],
                        icon: "🎯",
                        analysis: {
                            summary: "العنصر المركزي للخريطة الذهنية الهجينة الذكية",
                            keyPoints: ["تحديد الاتجاه", "توحيد الرؤية", "قياس النجاح"],
                            recommendations: ["مراجعة دورية", "تحديث الأهداف"]
                        }
                    }
                },
                {
                    id: 2,
                    title: "الذكاء الاصطناعي المتكامل",
                    type: "نشاط ابتكار",
                    category: "التقنية الذكية",
                    description: "دمج قدرات الذكاء الاصطناعي مع ميزات Freeplane لإنشاء تجربة فريدة",
                    downloadLinks: {},
                    aiGenerated: true,
                    freeplaneEnhanced: true,
                    smartFeatures: {
                        priority: "عالية",
                        autoConnections: [1, 5, 6],
                        icon: "🧠",
                        analysis: {
                            summary: "التكامل بين الذكاء الاصطناعي وأدوات الخرائط الذهنية",
                            keyPoints: ["تحليل تلقائي", "اقتراحات ذكية", "توسيع آلي"],
                            recommendations: ["تحسين النماذج", "إضافة المزيد من الأدوات"]
                        }
                    }
                },
                {
                    id: 3,
                    title: "التصدير والاستيراد المتقدم",
                    type: "مبادرة",
                    category: "التقنية الذكية",
                    description: "دعم تنسيق .mm من Freeplane للتوافق الكامل مع النظام البيئي للخرائط الذهنية",
                    downloadLinks: {},
                    aiGenerated: true,
                    freeplaneEnhanced: true,
                    smartFeatures: {
                        priority: "عالية",
                        autoConnections: [1, 2],
                        icon: "📤",
                        analysis: {
                            summary: "توفير التوافق مع أدوات الخرائط الذهنية الشائعة",
                            keyPoints: ["تنسيق XML", "الحفاظ على البيانات", "سهولة الانتقال"],
                            recommendations: ["دعم المزيد من التنسيقات", "تحسين التحويل"]
                        }
                    }
                },
                {
                    id: 4,
                    title: "القوالب الذكية",
                    type: "نشاط ابتكار",
                    category: "الابتكار",
                    description: "مكتبة شاملة من القوالب المستوحاة من Freeplane مع تحسينات ذكية",
                    downloadLinks: {},
                    aiGenerated: true,
                    freeplaneEnhanced: true,
                    smartFeatures: {
                        priority: "متوسطة",
                        autoConnections: [1, 7],
                        icon: "📋",
                        analysis: {
                            summary: "قوالب جاهزة لسيناريوهات مختلفة",
                            keyPoints: ["قالب المشروع", "قالب الفريق", "قالب التخطيط"],
                            recommendations: ["إضافة قوالب جديدة", "تخصيص المستخدم"]
                        }
                    }
                },
                {
                    id: 5,
                    title: "الأيقونات والرموز المتقدمة",
                    type: "مورد",
                    category: "التصميم",
                    description: "مكتبة أيقونات غنية مستوحاة من Freeplane مع إضافات عصرية",
                    downloadLinks: {},
                    aiGenerated: true,
                    freeplaneEnhanced: true,
                    smartFeatures: {
                        priority: "متوسطة",
                        autoConnections: [4, 6],
                        icon: "🎨",
                        analysis: {
                            summary: "تحسين المظهر البصري للخريطة الذهنية",
                            keyPoints: ["أيقونات الأولوية", "رموز الحالة", "إشارات التصنيف"],
                            recommendations: ["إضافة أيقونات مخصصة", "دعم الألوان المتعددة"]
                        }
                    }
                },
                {
                    id: 6,
                    title: "الروابط الذكية",
                    type: "نشاط ابتكار",
                    category: "التقنية الذكية",
                    description: "نظام ربط ذكي يكتشف العلاقات بين العقد تلقائياً",
                    downloadLinks: {},
                    aiGenerated: true,
                    freeplaneEnhanced: true,
                    smartFeatures: {
                        priority: "عالية",
                        autoConnections: [2, 5, 7],
                        icon: "🔗",
                        analysis: {
                            summary: "اكتشاف العلاقات الخفية بين الأفكار",
                            keyPoints: ["تحليل الكلمات المفتاحية", "روابط دلالية", "اقتراحات تلقائية"],
                            recommendations: ["تحسين خوارزمية المطابقة", "إضافة أنواع علاقات"]
                        }
                    }
                },
                {
                    id: 7,
                    title: "التخطيط التلقائي",
                    type: "نشاط ابتكار",
                    category: "الابتكار",
                    description: "محرك تخطيط ذكي يرتب العقد بشكل أمثل كما في Freeplane",
                    downloadLinks: {},
                    aiGenerated: true,
                    freeplaneEnhanced: true,
                    smartFeatures: {
                        priority: "عالية",
                        autoConnections: [4, 6, 8],
                        icon: "📐",
                        analysis: {
                            summary: "ترتيب تلقائي وذكي للعقد",
                            keyPoints: ["توزيع متوازن", "تجنب التداخل", "قابلية القراءة"],
                            recommendations: ["دعم أنماط تخطيط متعددة", "تخصيص المسافات"]
                        }
                    }
                },
                {
                    id: 8,
                    title: "فريق العمل المتكامل",
                    type: "عنصر فريق",
                    category: "الفريق",
                    description: "إدارة الفريق وتوزيع المهام بكفاءة عالية",
                    downloadLinks: {},
                    aiGenerated: true,
                    freeplaneEnhanced: true,
                    smartFeatures: {
                        priority: "عالية",
                        autoConnections: [7, 9, 10],
                        icon: "👥",
                        analysis: {
                            summary: "تنظيم وإدارة فريق العمل",
                            keyPoints: ["توزيع الأدوار", "التنسيق", "المتابعة"],
                            recommendations: ["تعزيز التواصل", "جلسات مراجعة دورية"]
                        }
                    }
                },
                {
                    id: 9,
                    title: "التحديات والمخاطر",
                    type: "تحدي",
                    category: "المخاطر",
                    description: "تحديد وتحليل التحديات المحتملة مع خطط التخفيف",
                    downloadLinks: {},
                    aiGenerated: true,
                    freeplaneEnhanced: true,
                    smartFeatures: {
                        priority: "عالية",
                        autoConnections: [8, 10],
                        icon: "⚠️",
                        analysis: {
                            summary: "إدارة المخاطر بشكل استباقي",
                            keyPoints: ["تحديد المخاطر", "تقييم التأثير", "خطط الطوارئ"],
                            recommendations: ["مراجعة دورية للمخاطر", "تحديث خطط التخفيف"]
                        }
                    }
                },
                {
                    id: 10,
                    title: "خطة المتابعة والتقييم",
                    type: "متابعة",
                    category: "التنفيذ",
                    description: "نظام متابعة شامل لقياس التقدم والنتائج",
                    downloadLinks: {},
                    aiGenerated: true,
                    freeplaneEnhanced: true,
                    smartFeatures: {
                        priority: "عالية",
                        autoConnections: [8, 9, 11],
                        icon: "📊",
                        analysis: {
                            summary: "قياس ومتابعة الأداء",
                            keyPoints: ["مؤشرات الأداء", "تقارير دورية", "تحليل الانحرافات"],
                            recommendations: ["أتمتة التقارير", "لوحات معلومات تفاعلية"]
                        }
                    }
                },
                {
                    id: 11,
                    title: "التحسين المستمر",
                    type: "مبدأ",
                    category: "الابتكار",
                    description: "منهجية كايزن للتحسين المستمر مدمجة في الخريطة الذهنية",
                    downloadLinks: {},
                    aiGenerated: true,
                    freeplaneEnhanced: true,
                    smartFeatures: {
                        priority: "متوسطة",
                        autoConnections: [10, 12],
                        icon: "🔄",
                        analysis: {
                            summary: "التطوير والتحسين المستمر",
                            keyPoints: ["دورة PDCA", "تحليل الأسباب الجذرية", "التعلم التنظيمي"],
                            recommendations: ["جمع التغذية الراجعة", "تطبيق الدروس المستفادة"]
                        }
                    }
                },
                {
                    id: 12,
                    title: "النتائج والإنجازات",
                    type: "هدف",
                    category: "التنفيذ",
                    description: "توثيق النتائج والإنجازات المحققة من الخريطة الذهنية الهجينة",
                    downloadLinks: {},
                    aiGenerated: true,
                    freeplaneEnhanced: true,
                    smartFeatures: {
                        priority: "عالية جداً",
                        autoConnections: [1, 10, 11],
                        icon: "🏆",
                        analysis: {
                            summary: "قياس النجاح والاحتفال بالإنجازات",
                            keyPoints: ["الأهداف المحققة", "الدروس المستفادة", "أفضل الممارسات"],
                            recommendations: ["مشاركة النجاحات", "بناء على الإنجازات"]
                        }
                    }
                }
            ],
            metadata: {
                version: "4.0.0",
                type: "hybrid-smart",
                engine: "Freeplane-Enhanced",
                created: new Date().toISOString(),
                features: [
                    "AI-Powered",
                    "Freeplane-Compatible",
                    "Smart Connections",
                    "Auto Layout",
                    "Icon Library",
                    "Templates"
                ]
            }
        };
    }

    /**
     * Download mind map as Freeplane .mm file
     * @param {Object} mindMapData - Mind map data
     * @param {string} filename - Output filename
     */
    downloadAsFreeplaneFormat(mindMapData, filename = 'hybrid-mindmap.mm') {
        const xmlContent = this.generateFreeplaneFormat(mindMapData);
        const blob = new Blob([xmlContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Import Freeplane file from input element
     * @param {File} file - Freeplane .mm file
     * @returns {Promise<Object>} - Parsed mind map data
     */
    async importFreeplaneFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const mindMapData = this.parseFreeplaneFormat(content);
                    resolve(mindMapData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
            reader.readAsText(file);
        });
    }
}

// Create singleton instance
const freeplaneService = new FreeplaneService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = freeplaneService;
}
