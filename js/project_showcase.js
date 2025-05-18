// 公交线网优化系统 - 项目展示页面脚本

document.addEventListener('DOMContentLoaded', function() {
    // 导航滚动效果
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                window.scrollTo({
                    top: targetSection.offsetTop - 70,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // 添加页面滚动动画
    const fadeElements = document.querySelectorAll('.fade-in');
    
    function checkFade() {
        fadeElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementTop < windowHeight - 100) {
                element.classList.add('visible');
            }
        });
    }
    
    // 初始检查
    checkFade();
    
    // 滚动时检查
    window.addEventListener('scroll', checkFade);
    
    // 图表切换功能
    const vizTabs = document.querySelectorAll('.viz-tab');
    const vizContents = document.querySelectorAll('.viz-content');
    
    vizTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有活动状态
            vizTabs.forEach(t => t.classList.remove('active'));
            vizContents.forEach(c => c.classList.remove('active'));
            
            // 添加当前活动状态
            this.classList.add('active');
            const targetContent = document.querySelector(this.getAttribute('data-target'));
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
    
    // 实验数据表格排序功能
    const tables = document.querySelectorAll('.result-table');
    
    tables.forEach(table => {
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            if (header.classList.contains('sortable')) {
                header.addEventListener('click', function() {
                    sortTable(table, index);
                });
            }
        });
    });
    
    function sortTable(table, columnIndex) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const isAscending = table.querySelector(`th:nth-child(${columnIndex + 1})`).classList.contains('asc');
        
        // 切换排序方向
        table.querySelectorAll('th').forEach(th => {
            th.classList.remove('asc', 'desc');
        });
        
        table.querySelector(`th:nth-child(${columnIndex + 1})`).classList.add(isAscending ? 'desc' : 'asc');
        
        // 排序行
        rows.sort((rowA, rowB) => {
            const cellA = rowA.querySelector(`td:nth-child(${columnIndex + 1})`).textContent.trim();
            const cellB = rowB.querySelector(`td:nth-child(${columnIndex + 1})`).textContent.trim();
            
            // 尝试数字排序，如果不是数字则按字母排序
            const numA = parseFloat(cellA);
            const numB = parseFloat(cellB);
            
            if (!isNaN(numA) && !isNaN(numB)) {
                return isAscending ? numB - numA : numA - numB;
            } else {
                return isAscending ? cellB.localeCompare(cellA) : cellA.localeCompare(cellB);
            }
        });
        
        // 重新排列行
        rows.forEach(row => {
            tbody.appendChild(row);
        });
    }
    
    // 对比分析切换
    const analysisTabs = document.querySelectorAll('.analysis-tab');
    const analysisContents = document.querySelectorAll('.analysis-content');
    
    analysisTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有活动状态
            analysisTabs.forEach(t => t.classList.remove('active'));
            analysisContents.forEach(c => c.classList.remove('active'));
            
            // 添加当前活动状态
            this.classList.add('active');
            const targetContent = document.querySelector(this.getAttribute('data-target'));
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}); 