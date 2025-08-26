// 在您的 uni-app login.vue 文件的 onMounted 中添加这些调试代码

onMounted(() => {
  console.log('=== URL参数调试 ===');
  console.log('当前URL:', window.location.href);
  console.log('search参数:', window.location.search);
  
  // 方法1：使用 URLSearchParams
  const urlParams = new URLSearchParams(window.location.search);
  console.log('URLSearchParams结果:', {
    redirect_uri: urlParams.get('redirect_uri'),
    所有参数: Object.fromEntries(urlParams)
  });
  
  // 方法2：使用 uni-app 的页面参数获取
  // 如果您的页面是通过 uni.navigateTo 或类似方式跳转的
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  console.log('uni-app页面参数:', currentPage.options);
  
  // 方法3：手动解析
  const search = window.location.search;
  if (search) {
    const params = {};
    search.substr(1).split('&').forEach(item => {
      const [key, value] = item.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    });
    console.log('手动解析结果:', params);
  }
  
  console.log('=== 调试结束 ===');
});

// 如果您发现参数解析有问题，可以使用这个修复版本的 getUrlParams 函数：

function getUrlParams() {
  try {
    // 首先尝试使用 uni-app 的页面参数
    const pages = getCurrentPages();
    if (pages.length > 0) {
      const currentPage = pages[pages.length - 1];
      if (currentPage.options && currentPage.options.redirect_uri) {
        return {
          redirect_uri: decodeURIComponent(currentPage.options.redirect_uri),
          state: currentPage.options.state ? decodeURIComponent(currentPage.options.state) : null
        };
      }
    }
    
    // 如果 uni-app 方式失败，使用标准方式
    const urlParams = new URLSearchParams(window.location.search);
    return {
      redirect_uri: urlParams.get('redirect_uri'),
      state: urlParams.get('state')
    };
  } catch (error) {
    console.error('获取URL参数失败:', error);
    return {};
  }
}
