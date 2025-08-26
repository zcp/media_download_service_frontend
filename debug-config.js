// 调试配置工具 - 在浏览器控制台中运行以下代码来检查配置

// 1. 检查配置是否加载
console.log('=== 配置调试信息 ===');
console.log('window.__ENV:', window.__ENV);

// 2. 检查LOGIN_URL
if (window.__ENV) {
    console.log('✅ 配置已加载');
    console.log('VITE_LOGIN_URL:', window.__ENV.VITE_LOGIN_URL);
    console.log('VITE_BASE_API_URL:', window.__ENV.VITE_BASE_API_URL);
} else {
    console.log('❌ 配置未加载，请检查：');
    console.log('1. config/env.js 文件是否存在');
    console.log('2. index.html 中是否正确引入了 <script src="/config/env.js"></script>');
    console.log('3. 文件路径是否正确');
}

// 3. 测试常量导入
try {
    import('/src/constants/api.js').then(module => {
        console.log('=== API常量 ===');
        console.log('LOGIN_URL:', module.LOGIN_URL);
        console.log('BASE_API_URL:', module.BASE_API_URL);
        
        // 测试重定向
        console.log('当前应该跳转到:', module.LOGIN_URL);
        
        if (module.LOGIN_URL.includes('localhost:3000')) {
            console.error('❌ 错误：LOGIN_URL 包含 localhost:3000，应该是 localhost:5173');
        } else if (module.LOGIN_URL.includes('localhost:5173')) {
            console.log('✅ 正确：LOGIN_URL 指向 localhost:5173');
        } else {
            console.log('ℹ️ 其他地址:', module.LOGIN_URL);
        }
    });
} catch (error) {
    console.error('导入API常量失败:', error);
}
