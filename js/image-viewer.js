// 图片放大后的左右切换功能
// 不重新初始化 medium-zoom，而是扩展已有的 zoom 实例
(function() {
  function initImageNav() {
    // 获取文章中所有图片
    function getArticleImages() {
      var container = document.getElementById('article-container') || document.getElementById('post-content');
      if (!container) return [];
      return Array.from(container.querySelectorAll('img')).filter(function(img) {
        return img.naturalWidth > 100 || img.width > 100;
      });
    }

    var images = getArticleImages();
    if (images.length <= 1) return; // 只有一张或没有图片，不需要导航

    var currentIndex = 0;
    var prevBtn = null;
    var nextBtn = null;
    var overlay = null;

    // 创建导航按钮
    function createNavButtons() {
      if (prevBtn && nextBtn) return;

      prevBtn = document.createElement('button');
      prevBtn.className = 'image-nav-btn prev';
      prevBtn.innerHTML = '❮';
      prevBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        navigateImage(-1);
      });

      nextBtn = document.createElement('button');
      nextBtn.className = 'image-nav-btn next';
      nextBtn.innerHTML = '❯';
      nextBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        navigateImage(1);
      });

      document.body.appendChild(prevBtn);
      document.body.appendChild(nextBtn);
    }

    // 移除导航按钮
    function removeNavButtons() {
      if (prevBtn) { prevBtn.remove(); prevBtn = null; }
      if (nextBtn) { nextBtn.remove(); nextBtn = null; }
    }

    // 切换图片
    function navigateImage(direction) {
      currentIndex = (currentIndex + direction + images.length) % images.length;
      var img = images[currentIndex];

      // 找到 overlay 中的图片并更新
      overlay = document.querySelector('.medium-zoom-overlay');
      var zoomedImg = document.querySelector('.medium-zoom-image--opened');
      if (zoomedImg && img) {
        // 关闭当前 zoom，打开新的
        // 通过触发点击来切换
        zoomedImg.click();

        // 延迟后点击目标图片
        setTimeout(function() {
          img.click();
          // 重新创建导航按钮
          setTimeout(createNavButtons, 100);
        }, 300);
      }
    }

    // 监听 zoom 打开事件（通过 MutationObserver 检测 overlay 出现）
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        // 检测 overlay 是否出现
        var newOverlay = document.querySelector('.medium-zoom-overlay');
        if (newOverlay && !overlay) {
          // overlay 刚出现，找到当前打开的图片
          var openedImg = document.querySelector('.medium-zoom-image--opened');
          if (openedImg) {
            currentIndex = images.indexOf(openedImg);
            if (currentIndex === -1) currentIndex = 0;
            createNavButtons();
          }
        } else if (!newOverlay && overlay) {
          // overlay 消失
          removeNavButtons();
        }
        overlay = newOverlay;
      });
    });

    // 开始观察 body 的子节点变化
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 页面加载后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageNav);
  } else {
    initImageNav();
  }
})();
