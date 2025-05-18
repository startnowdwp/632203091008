// 全局变量
let map;
let stopsLayer;
let areasLayer;
let stopsData = null;
let areasData = null;
let optimizationResults = null;
let stopsFilename = null;
let areasFilename = null;
let visualizations = null;
let mapInitialized = false;
let mapInitAttempts = 0;

// 检查地图初始化状态
function checkMapStatus() {
    console.log("检查地图初始化状态...");
    if (!mapInitialized && mapInitAttempts < 3) {
        console.log(`地图未初始化，尝试重新初始化（第${mapInitAttempts + 1}次）`);
        initializeMap();
    }
}

// 初始化地图
function initializeMap() {
    mapInitAttempts++;
    console.log(`开始初始化地图（尝试${mapInitAttempts}/3）`);
    
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error("找不到地图容器元素!");
        return;
    }
    
    // 确保Leaflet库已加载
    if (typeof L === 'undefined') {
        console.error("Leaflet库未加载!");
        if (mapInitAttempts >= 3) {
            alert("地图组件加载失败，请刷新页面或检查网络连接。");
        } else {
            // 稍后重试
            setTimeout(checkMapStatus, 1000);
        }
        return;
    }
    
    try {
        console.log("创建地图实例...");
        
        // 初始化地图 - 使用中国区域的初始视图
        map = L.map('map', {
            center: [35.0, 105.0], // 中国中心位置
            zoom: 4,
            minZoom: 2,
            maxZoom: 18,
            zoomControl: true
        });
        
        console.log("地图实例创建成功，添加图层...");

        // 添加地图图层 - 使用多个地图源选项
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });
        
        const cartoDBLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution">CARTO</a>'
        });
        
        // 默认使用CartoDD浅色底图
        cartoDBLayer.addTo(map);
        
        // 添加图层控制
        const baseMaps = {
            "OpenStreetMap": osmLayer,
            "CartoDB Light": cartoDBLayer
        };
        
        L.control.layers(baseMaps).addTo(map);

    // 初始化图层
    stopsLayer = L.layerGroup().addTo(map);
    areasLayer = L.layerGroup().addTo(map);

    // 添加图例
    addLegend();

        // 添加比例尺
        L.control.scale({imperial: false}).addTo(map);

        console.log("地图初始化成功!");
        mapInitialized = true;
        
        // 触发一次地图重绘，解决某些浏览器的渲染问题
        setTimeout(function() {
            if (map) {
                map.invalidateSize();
                console.log("地图大小已重新计算");
            }
        }, 500);
        
    } catch (error) {
        console.error("地图初始化失败:", error);
        if (mapInitAttempts >= 3) {
            alert("地图初始化失败: " + error.message);
        } else {
            // 稍后重试
            setTimeout(checkMapStatus, 1000);
        }
    }
}

// 初始化地图
document.addEventListener('DOMContentLoaded', function() {
    // 调试信息
    console.log("DOM内容已加载，准备初始化地图");
    
    // 初始化地图
    initializeMap();

    // 初始化事件监听器
    initEventListeners();
    
    // 初始化时设置p值的最大限制
    validatePValue();
    
    // 监听标签页切换事件，修复地图在标签页内的显示问题
    const triggerTabList = [].slice.call(document.querySelectorAll('a[data-bs-toggle="tab"]'));
    triggerTabList.forEach(function(tabEl) {
        tabEl.addEventListener('shown.bs.tab', function(event) {
            if (event.target.id === 'map-tab' && map) {
                console.log("标签页切换到地图，重新计算地图大小");
                setTimeout(function() {
                    if (map) {
                        map.invalidateSize();
                        console.log("标签页切换后，地图大小已重新计算");
                    }
                }, 100);
            }
        });
    });
});

// 添加地图图例
function addLegend() {
    const legend = L.control({position: 'bottomright'});

    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'legend');
        div.innerHTML = `
            <h6>图例</h6>
            <i style="background: #4CAF50"></i> 活跃站点<br>
            <i style="background: #F44336"></i> 移除站点<br>
            <i style="background: rgba(0, 0, 255, 0.3)"></i> 服务区域<br>
        `;
        return div;
    };

    legend.addTo(map);
}

// 初始化事件监听器
function initEventListeners() {
    // 服务半径滑块
    document.getElementById('serviceRadius').addEventListener('input', function() {
        document.getElementById('serviceRadiusValue').textContent = this.value;
    });

    // Alpha滑块
    document.getElementById('alpha').addEventListener('input', function() {
        document.getElementById('alphaValue').textContent = this.value;
    });

    // Beta滑块
    document.getElementById('beta').addEventListener('input', function() {
        document.getElementById('betaValue').textContent = this.value;
    });

    // 惩罚系数滑块
    document.getElementById('penaltyFactor').addEventListener('input', function() {
        document.getElementById('penaltyFactorValue').textContent = this.value;
    });

    // 批次约束乘数滑块
    document.getElementById('batchPMultiplier').addEventListener('input', function() {
        document.getElementById('batchPMultiplierValue').textContent = this.value;
    });

    // 批处理大小和p值的关联验证
    document.getElementById('batchSize').addEventListener('change', validatePValue);
    document.getElementById('pValue').addEventListener('change', validatePValue);

    // 上传站点数据按钮
    document.getElementById('uploadStopsBtn').addEventListener('click', uploadStopsData);

    // 上传区域数据按钮
    document.getElementById('uploadAreasBtn').addEventListener('click', uploadAreasData);

    // 优化按钮
    document.getElementById('optimizeBtn').addEventListener('click', startOptimization);

    // 导出结果按钮
    document.getElementById('exportResultBtn').addEventListener('click', exportResults);

    // 重置按钮
    document.getElementById('resetBtn').addEventListener('click', resetAll);

    // 显示过滤器
    document.getElementById('showActiveOnly').addEventListener('change', updateMapDisplay);
    document.getElementById('showRemovedOnly').addEventListener('change', updateMapDisplay);
    document.getElementById('showAllStops').addEventListener('change', updateMapDisplay);

    // 批处理大小变化时，更新p值的最大值并验证
    document.getElementById('batchSize').addEventListener('change', function() {
        const batchSize = parseInt(this.value);
        const pValueInput = document.getElementById('pValue');
        
        // 如果当前p值超过新的batch大小，自动调整p值
        if (parseInt(pValueInput.value) >= batchSize) {
            pValueInput.value = batchSize - 1;
        }
        
        // 更新验证
        validatePValue();
    });
}

// 上传站点数据
async function uploadStopsData() {
    const fileInput = document.getElementById('stopsFile');
    if (!fileInput.files.length) {
        alert('请选择站点数据文件');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/upload_stops', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            stopsData = data.preview;
            stopsFilename = data.filename;
            document.getElementById('stopsStatus').innerHTML = `
                <strong>站点数据：</strong>已上传 (${data.filename})<br>
                <small>共 ${data.preview.length} 条记录（已全部显示）</small>
            `;
            
            // 在地图上显示所有站点，而不仅仅是预览
            displayStopsOnMap(data.preview);
            
            // 检查是否可以启用优化按钮
            checkOptimizeButtonStatus();
        } else {
            alert(`上传失败: ${data.error}`);
        }
    } catch (error) {
        console.error('上传站点数据出错:', error);
        alert('上传站点数据时发生错误，请查看控制台获取详细信息');
    }
}

// 上传区域数据
async function uploadAreasData() {
    const fileInput = document.getElementById('areasFile');
    if (!fileInput.files.length) {
        alert('请选择区域数据文件');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/upload_areas', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            areasData = data.preview;
            areasFilename = data.filename;
            document.getElementById('areasStatus').innerHTML = `
                <strong>区域数据：</strong>已上传 (${data.filename})<br>
                <small>共 ${data.preview.length} 条记录（已全部显示）</small>
            `;
            
            // 在地图上显示所有区域，而不仅仅是预览
            displayAreasOnMap(data.preview);
            
            // 检查是否可以启用优化按钮
            checkOptimizeButtonStatus();
        } else {
            alert(`上传失败: ${data.error}`);
        }
    } catch (error) {
        console.error('上传区域数据出错:', error);
        alert('上传区域数据时发生错误，请查看控制台获取详细信息');
    }
}

// 验证p值与batch值的关系
function validatePValue() {
    const batchSizeInput = document.getElementById('batchSize');
    const pValueInput = document.getElementById('pValue');
    const pValueWarning = document.getElementById('pValueWarning');
    const optimizeBtn = document.getElementById('optimizeBtn');
    
    const batchSize = parseInt(batchSizeInput.value);
    const pValue = parseInt(pValueInput.value);
    
    // 设置pValue的动态最大值为batchSize - 1
    const maxAllowedP = batchSize - 1;
    
    // 显示允许的最大值
    pValueInput.setAttribute('max', maxAllowedP);
    
    // 如果当前p值大于或等于batch值，显示警告
    if (pValue >= batchSize) {
        pValueWarning.style.display = 'block';
        pValueWarning.textContent = `警告：p值必须小于批处理大小(batch=${batchSize})！建议最大值: ${maxAllowedP}`;
        
        // 如果数据已上传，禁用优化按钮
        if (stopsData && areasData) {
            optimizeBtn.disabled = true;
        }
    } else {
        pValueWarning.style.display = 'none';
        
        // 如果数据已上传，启用优化按钮
        if (stopsData && areasData) {
            optimizeBtn.disabled = false;
        }
    }
}

// 检查是否可以启用优化按钮
function checkOptimizeButtonStatus() {
    // 如果两种数据都已上传，则调用validatePValue()检验约束并相应地启用/禁用按钮
    if (stopsData && areasData) {
        validatePValue();
    } else {
        // 如果数据未完全上传，禁用优化按钮
        document.getElementById('optimizeBtn').disabled = true;
    }
}

// 在地图上显示站点
function displayStopsOnMap(stops) {
    // 清除现有站点
    if (stopsLayer) {
    stopsLayer.clearLayers();
    } else {
        console.warn("站点图层未初始化");
        if (map) {
            stopsLayer = L.layerGroup().addTo(map);
        } else {
            console.error("地图未初始化，无法显示站点");
            return;
        }
    }
    
    // 添加新站点
    stops.forEach(stop => {
        const marker = L.circleMarker([stop.Lat, stop.Long], {
            radius: 6,
            fillColor: '#3388ff',
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(stopsLayer);
        
        marker.bindPopup(`
            <strong>站点ID:</strong> ${stop.StopID}<br>
            <strong>名称:</strong> ${stop.Name || 'N/A'}<br>
            <strong>路线:</strong> ${stop.Routes || 'N/A'}<br>
            <strong>权重:</strong> ${stop.weights || 'N/A'}
        `);
    });
    
    // 调整地图视图以适应所有站点
    if (stops.length > 0) {
        const lats = stops.map(s => s.Lat);
        const longs = stops.map(s => s.Long);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLong = Math.min(...longs);
        const maxLong = Math.max(...longs);
        
        map.fitBounds([
            [minLat, minLong],
            [maxLat, maxLong]
        ]);
    }
}

// 在地图上显示区域
function displayAreasOnMap(areas) {
    // 清除现有区域
    if (areasLayer) {
    areasLayer.clearLayers();
    } else {
        console.warn("区域图层未初始化");
        if (map) {
            areasLayer = L.layerGroup().addTo(map);
        } else {
            console.error("地图未初始化，无法显示区域");
            return;
        }
    }
    
    // 添加新区域
    areas.forEach(area => {
        const circle = L.circle([area.AreaLat, area.AreaLong], {
            radius: 200,  // 200米半径，仅用于可视化
            fillColor: 'blue',
            color: 'blue',
            weight: 1,
            opacity: 0.3,
            fillOpacity: 0.1
        }).addTo(areasLayer);
        
        circle.bindPopup(`
            <strong>区域ID:</strong> ${area.AreaID}<br>
            <strong>需求:</strong> ${area.AreaDemand || 'N/A'}<br>
        `);
    });
}

// 显示QUBO可视化
function displayQuboVisualizations(visualizations) {
    console.log("正在处理可视化结果:", visualizations);
    if (!visualizations) {
        console.error("没有接收到可视化数据");
        return;
    }
    
    // 显示QUBO可视化选项卡
    document.getElementById('quboTypeTabs').style.display = 'flex';
    document.getElementById('qubo-explanation').style.display = 'block';
    document.getElementById('no-viz-message').style.display = 'none';
    
    // 隐藏所有标签页中的"请先进行优化"提示
    const noVizMessages = document.querySelectorAll('.no-viz-message');
    noVizMessages.forEach(msg => {
        msg.style.display = 'none';
    });
    
    // 设置QUBO图像
    if (visualizations['无约束QUBO']) {
        console.log("处理无约束QUBO可视化");
        const noConstraintImg = document.getElementById('no-constraint-img');
        noConstraintImg.src = 'data:image/png;base64,' + visualizations['无约束QUBO'];
        noConstraintImg.style.display = 'block';
    } else {
        console.error("无约束QUBO可视化数据缺失");
    }
    
    if (visualizations['全局约束QUBO']) {
        console.log("处理全局约束QUBO可视化");
        const globalConstraintImg = document.getElementById('global-constraint-img');
        globalConstraintImg.src = 'data:image/png;base64,' + visualizations['全局约束QUBO'];
        globalConstraintImg.style.display = 'block';
    } else {
        console.error("全局约束QUBO可视化数据缺失");
    }
    
    if (visualizations['稀疏约束QUBO']) {
        console.log("处理稀疏约束QUBO可视化");
        const sparseConstraintImg = document.getElementById('sparse-constraint-img');
        sparseConstraintImg.src = 'data:image/png;base64,' + visualizations['稀疏约束QUBO'];
        sparseConstraintImg.style.display = 'block';
    } else {
        console.error("稀疏约束QUBO可视化数据缺失");
    }
    
    // 处理目标函数迭代图
    if (visualizations['目标函数迭代']) {
        console.log("处理目标函数迭代可视化");
        const objectiveFunctionImg = document.getElementById('objective-function-img');
        
        // 添加调试信息
        const imgData = visualizations['目标函数迭代'];
        console.log("目标函数图像数据长度:", imgData.length);
        console.log("图像数据前50字符:", imgData.substring(0, 50));
        
        // 先移除之前的no-viz-message类
        const noVizMessages = document.querySelectorAll('#objective-content .no-viz-message');
        noVizMessages.forEach(el => el.style.display = 'none');
        
        // 设置图像并显示
        objectiveFunctionImg.src = 'data:image/png;base64,' + imgData;
        objectiveFunctionImg.style.display = 'block';
        
        // 添加载入事件监听
        objectiveFunctionImg.onload = function() {
            console.log("目标函数图像已成功加载, 大小:", this.width, "x", this.height);
        };
        
        objectiveFunctionImg.onerror = function() {
            console.error("目标函数图像加载失败");
            // 尝试使用备用静态图像
            this.src = '/static/debug_objective_plot.png';
            this.onerror = null; // 防止无限循环
        };
    } else {
        console.error("目标函数迭代可视化数据缺失");
    }
    
    // 处理迭代日志
    if (visualizations['迭代日志']) {
        console.log("处理迭代日志");
        const iterationLogsContent = document.getElementById('iteration-logs-content');
        
        // 合并日志行并以换行符分隔
        const logsText = visualizations['迭代日志'].join('\n');
        iterationLogsContent.textContent = logsText;
        
        // 添加下载日志按钮的事件处理
        const downloadLogsBtn = document.getElementById('downloadLogsBtn');
        downloadLogsBtn.addEventListener('click', function() {
            downloadIterationLogs(logsText);
        });
    } else {
        console.error("迭代日志数据缺失");
        document.getElementById('iteration-logs-content').textContent = "优化过程中未生成迭代日志。";
    }
    
    // 显示结果统计卡片
    document.getElementById('resultsCard').style.display = 'block';
}

// 下载迭代日志的功能
function downloadIterationLogs(logsText) {
    const date = new Date();
    const timestamp = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}_${date.getHours()}-${date.getMinutes()}`;
    
    // 创建下载链接
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `optimization_logs_${timestamp}.txt`;
    
    // 模拟点击下载
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 获取并显示可视化结果
async function fetchAndDisplayVisualizations() {
    try {
        const response = await fetch('/visualizations');
        const data = await response.json();
        
        if (data.success) {
            console.log("成功获取可视化数据");
            visualizations = data.visualizations;
            displayQuboVisualizations(visualizations);
        } else {
            console.error("获取可视化数据失败:", data.error);
            alert("获取可视化数据失败: " + (data.error || "未知错误"));
        }
    } catch (error) {
        console.error("获取可视化数据时出错:", error);
        alert("获取可视化数据时出错，请查看控制台获取详细信息");
    }
}

// 开始优化
async function startOptimization() {
    // 检查数据是否已上传
    if (!stopsData || !areasData) {
        alert('请先上传站点和区域数据');
        return;
    }
    
    // 获取参数
    const serviceRadius = parseFloat(document.getElementById('serviceRadius').value);
    const alpha = parseFloat(document.getElementById('alpha').value);
    const beta = parseFloat(document.getElementById('beta').value);
    const competitorRadius = parseFloat(document.getElementById('competitorRadius').value || (serviceRadius * 0.6).toFixed(2));
    const penaltyScale = parseFloat(document.getElementById('penaltyFactor').value);
    const batchSize = parseInt(document.getElementById('batchSize').value);
    const pValue = parseInt(document.getElementById('pValue').value);
    const saIterations = parseInt(document.getElementById('saIterations').value);
    const usePConstraint = document.getElementById('usePConstraint').checked;
    const batchPMultiplier = parseFloat(document.getElementById('batchPMultiplier').value);
    
    // 验证p值和batch值的关系
    if (pValue >= batchSize) {
        alert('每批次保留站点数(p)必须小于批处理大小(batch)！');
        return;
    }
    
    // 更新优化状态
    document.getElementById('optimizationStatus').innerHTML = `
        <strong>优化状态：</strong>正在进行...
        <div class="spinner-border spinner-border-sm text-primary ms-2" role="status">
            <span class="visually-hidden">正在优化...</span>
        </div>
    `;
    
    // 禁用优化按钮，防止重复提交
    document.getElementById('optimizeBtn').disabled = true;
    
    try {
        // 发送优化请求
        const response = await fetch('/optimize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                stops_file: stopsFilename,
                areas_file: areasFilename,
                service_radius: serviceRadius,
                alpha: alpha,
                beta: beta,
                competitor_radius: competitorRadius,
                penalty_scale: penaltyScale,
                batch_size: batchSize,
                p_value: pValue,
                sa_iterations: saIterations,
                use_p_constraint: usePConstraint,
                batch_p_multiplier: batchPMultiplier
            })
        });
        
        // 处理响应
        const result = await response.json();
        
        if (result.success) {
            // 更新优化状态
            document.getElementById('optimizationStatus').innerHTML = `
                <strong>优化状态：</strong>完成
                <i class="bi bi-check-circle-fill text-success ms-2"></i>
            `;
            
            // 显示优化结果
            optimizationResults = result.result; // 使用result而不是results
            displayOptimizationResults(result.result);
            
            // 获取并显示可视化结果
            await fetchAndDisplayVisualizations();
            
            // 启用导出结果按钮
            document.getElementById('exportResultBtn').disabled = false;
        } else {
            // 更新优化状态
            document.getElementById('optimizationStatus').innerHTML = `
                <strong>优化状态：</strong>失败
                <i class="bi bi-x-circle-fill text-danger ms-2"></i>
            `;
            alert(`优化失败: ${result.error}`);
        }
    } catch (error) {
        console.error('优化过程出错:', error);
        document.getElementById('optimizationStatus').innerHTML = `
            <strong>优化状态：</strong>发生错误
            <i class="bi bi-exclamation-triangle-fill text-warning ms-2"></i>
        `;
        alert('优化过程中发生错误，请查看控制台获取详细信息');
    } finally {
        // 重新启用优化按钮
        document.getElementById('optimizeBtn').disabled = false;
    }
}

// 显示优化结果
function displayOptimizationResults(results) {
    // 清除现有站点
    stopsLayer.clearLayers();
    
    // 统计数据
    const totalStops = results.length;
    const activeStops = results.filter(s => s.active === 1).length;
    const removedStops = results.filter(s => s.active === 0).length;
    
    // 更新统计信息
    document.getElementById('totalStops').textContent = totalStops;
    document.getElementById('activeStops').textContent = activeStops;
    document.getElementById('removedStops').textContent = removedStops;
    
    // 填充站点ID列表
    const activeStopsList = document.getElementById('activeStopsList');
    const removedStopsList = document.getElementById('removedStopsList');
    
    // 清空现有列表
    activeStopsList.innerHTML = '';
    removedStopsList.innerHTML = '';
    
    // 获取保留站点和移除站点
    const activeStopsArray = results.filter(s => s.active === 1);
    const removedStopsArray = results.filter(s => s.active === 0);
    
    // 检查是否有数据
    if (activeStopsArray.length === 0) {
        activeStopsList.innerHTML = '<li class="list-group-item text-center text-muted">暂无保留站点</li>';
    } else {
        // 按站点ID排序
        activeStopsArray.sort((a, b) => {
            // 尝试将ID转换为数字进行比较，如果不是纯数字则按字符串比较
            const idA = isNaN(parseInt(a.id)) ? a.id : parseInt(a.id);
            const idB = isNaN(parseInt(b.id)) ? b.id : parseInt(b.id);
            
            if (typeof idA === 'number' && typeof idB === 'number') {
                return idA - idB;
            } else {
                return String(idA).localeCompare(String(idB));
            }
        });
        
        // 填充保留站点列表
        activeStopsArray.forEach(stop => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                站点ID: ${stop.id}
                <span class="badge bg-success rounded-pill">得分: ${stop.score.toFixed(2)}</span>
            `;
            activeStopsList.appendChild(li);
        });
    }
    
    if (removedStopsArray.length === 0) {
        removedStopsList.innerHTML = '<li class="list-group-item text-center text-muted">暂无移除站点</li>';
    } else {
        // 按站点ID排序
        removedStopsArray.sort((a, b) => {
            // 尝试将ID转换为数字进行比较，如果不是纯数字则按字符串比较
            const idA = isNaN(parseInt(a.id)) ? a.id : parseInt(a.id);
            const idB = isNaN(parseInt(b.id)) ? b.id : parseInt(b.id);
            
            if (typeof idA === 'number' && typeof idB === 'number') {
                return idA - idB;
            } else {
                return String(idA).localeCompare(String(idB));
            }
        });
        
        // 填充移除站点列表
        removedStopsArray.forEach(stop => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                站点ID: ${stop.id}
                <span class="badge bg-danger rounded-pill">得分: ${stop.score.toFixed(2)}</span>
            `;
            removedStopsList.appendChild(li);
        });
    }
    
    // 根据过滤器设置显示站点
    updateMapDisplay();
}

// 根据过滤器更新地图显示
function updateMapDisplay() {
    if (!optimizationResults) return;
    
    // 检查地图是否已初始化
    if (!map || !mapInitialized) {
        console.warn("地图未初始化，无法更新显示");
        setTimeout(function() {
            if (map && mapInitialized) {
                updateMapDisplay();
            }
        }, 1000);
        return;
    }
    
    // 获取过滤器状态
    const showActiveOnly = document.getElementById('showActiveOnly').checked;
    const showRemovedOnly = document.getElementById('showRemovedOnly').checked;
    const showAllStops = document.getElementById('showAllStops').checked;
    
    // 清除现有站点
    if (stopsLayer) {
    stopsLayer.clearLayers();
    } else {
        stopsLayer = L.layerGroup().addTo(map);
    }
    
    // 根据过滤器显示站点
    optimizationResults.forEach(stop => {
        // 确定是否显示此站点
        let shouldDisplay = false;
        if (showAllStops) {
            shouldDisplay = true;
        } else if (showActiveOnly && stop.active === 1) {
            shouldDisplay = true;
        } else if (showRemovedOnly && stop.active === 0) {
            shouldDisplay = true;
        }
        
        if (shouldDisplay) {
            // 确定站点颜色
            const fillColor = stop.active === 1 ? '#4CAF50' : '#F44336';
            
            const marker = L.circleMarker([stop.lat, stop.long], {
                radius: 6,
                fillColor: fillColor,
                color: '#fff',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(stopsLayer);
            
            marker.bindPopup(`
                <strong>站点ID:</strong> ${stop.id}<br>
                <strong>需求:</strong> ${stop.demand}<br>
                <strong>权重:</strong> ${stop.weight.toFixed(2)}<br>
                <strong>竞争站点数:</strong> ${stop.competitors}<br>
                <strong>得分:</strong> ${stop.score.toFixed(2)}<br>
                <strong>状态:</strong> ${stop.active === 1 ? '保留' : '移除'}
            `);
        }
    });
}

// 导出结果
function exportResults() {
    if (!optimizationResults) {
        alert('没有可导出的优化结果');
        return;
    }
    
    // 创建CSV内容
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ID,纬度,经度,需求,权重,竞争站点数,得分,状态\n';
    
    optimizationResults.forEach(stop => {
        const row = [
            stop.id,
            stop.lat,
            stop.long,
            stop.demand,
            stop.weight,
            stop.competitors,
            stop.score,
            stop.active === 1 ? '保留' : '移除'
        ].join(',');
        csvContent += row + '\n';
    });
    
    // 创建下载链接
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'optimization_results.csv');
    document.body.appendChild(link);
    
    // 触发下载
    link.click();
    
    // 清理
    document.body.removeChild(link);
}

// 重置所有
function resetAll() {
    // 重置数据
    stopsData = null;
    areasData = null;
    optimizationResults = null;
    stopsFilename = null;
    areasFilename = null;
    visualizations = null;
    
    // 重置文件输入
    document.getElementById('stopsFile').value = '';
    document.getElementById('areasFile').value = '';
    
    // 重置基本参数
    document.getElementById('serviceRadius').value = 0.5;
    document.getElementById('serviceRadiusValue').textContent = '0.5';
    
    // 重置高级参数
    document.getElementById('alpha').value = 1.0;
    document.getElementById('alphaValue').textContent = '1.0';
    document.getElementById('beta').value = 2.0;
    document.getElementById('betaValue').textContent = '2.0';
    document.getElementById('penaltyFactor').value = 10;
    document.getElementById('penaltyFactorValue').textContent = '10';
    document.getElementById('batchSize').value = 5;
    document.getElementById('saIterations').value = 10;
    document.getElementById('usePConstraint').checked = true;
    
    // 重置过滤器
    document.getElementById('showActiveOnly').checked = true;
    document.getElementById('showRemovedOnly').checked = false;
    document.getElementById('showAllStops').checked = false;
    
    // 重置状态
    document.getElementById('stopsStatus').innerHTML = '<strong>站点数据：</strong>未上传';
    document.getElementById('areasStatus').innerHTML = '<strong>区域数据：</strong>未上传';
    document.getElementById('optimizationStatus').innerHTML = '<strong>优化状态：</strong>未开始';
    
    // 禁用按钮
    document.getElementById('optimizeBtn').disabled = true;
    document.getElementById('exportResultBtn').disabled = true;
    
    // 隐藏结果统计卡片
    document.getElementById('resultsCard').style.display = 'none';
    
    // 重置可视化
    document.getElementById('quboTypeTabs').style.display = 'none';
    document.getElementById('qubo-explanation').style.display = 'none';
    
    // 显示所有"请先进行优化"提示
    const noVizMessages = document.querySelectorAll('.no-viz-message');
    noVizMessages.forEach(msg => {
        msg.style.display = 'block';
    });
    
    // 隐藏所有图像
    document.getElementById('no-constraint-img').style.display = 'none';
    document.getElementById('global-constraint-img').style.display = 'none';
    document.getElementById('sparse-constraint-img').style.display = 'none';
    document.getElementById('objective-function-img').style.display = 'none';
    
    // 重置迭代日志
    document.getElementById('iteration-logs-content').textContent = '等待优化完成后显示迭代日志...';
    
    // 清除地图图层
    if (map && mapInitialized) {
        if (stopsLayer) stopsLayer.clearLayers();
        if (areasLayer) areasLayer.clearLayers();
        
        // 重置地图视图
        map.setView([35.0, 105.0], 4);
    }
    
    // 重置站点ID列表
    document.getElementById('activeStopsList').innerHTML = '<li class="list-group-item text-center text-muted">暂无数据</li>';
    document.getElementById('removedStopsList').innerHTML = '<li class="list-group-item text-center text-muted">暂无数据</li>';
}

/* 地图调试和修复辅助函数 */
document.addEventListener('error', function(e) {
    // 检查是否为瓦片图加载错误
    if (e.target.tagName === 'IMG' && e.target.classList.contains('leaflet-tile')) {
        console.warn('地图瓦片加载错误:', e.target.src);
    }
}, true);

// 添加窗口加载完成后的额外检查
window.addEventListener('load', function() {
    console.log('页面完全加载，检查地图状态...');
    setTimeout(function() {
        if (!mapInitialized) {
            console.warn('页面加载完成后地图仍未初始化，尝试重新初始化');
            initializeMap();
        } else if (map) {
            console.log('地图已初始化，检查瓦片加载...');
            map.invalidateSize();
            // 尝试平移地图以触发瓦片加载
            map.panBy([1, 1]);
            map.panBy([-1, -1]);
        }
    }, 1000);
});

// 切换标签页时刷新地图
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'map-tab') {
        console.log('点击了地图标签页');
        setTimeout(function() {
            if (map && mapInitialized) {
                console.log('刷新地图大小');
                map.invalidateSize();
            }
        }, 100);
    }
});

/* 强制浏览器重新加载JavaScript文件的小技巧 */

// 下载目标函数图表
function downloadObjectiveChart(pdfData) {
    const date = new Date();
    const timestamp = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}_${date.getHours()}-${date.getMinutes()}`;
    
    // 创建下载链接
    const blob = new Blob([base64ToArrayBuffer(pdfData)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `objective_function_chart_${timestamp}.pdf`;
    
    // 模拟点击下载
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Base64转换为ArrayBuffer
function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}
