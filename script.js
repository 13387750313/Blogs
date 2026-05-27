/* ============================================
   全局 JS — 音乐播放 + 页面交互
   每个页面独立加载，音乐状态通过 localStorage
   跨页面保持（曲目/音量/进度/播放状态）。
   ============================================ */

// ===== 配置 =====
var MUSIC_TRACKS = [
  { src: 'music/qinshi-erhu.m4a', title: '琴师（二胡版）', artist: '大明落榜美术生' },
  { src: 'music/cyberpunk-bg.mp3',     title: 'Cyberpunk BG',   artist: 'CANN' }
];

var STORE_KEYS = {
  track:   'cyberverse_track',
  volume:  'cyberverse_volume',
  time:    'cyberverse_time',
  playing: 'cyberverse_playing'
};

// ===== 状态 =====
var bgAudio = null;
var currentTrackIndex = 0;

// ===== 入口 =====
document.addEventListener('DOMContentLoaded', function () {
  initMusicPlayer();
  initNavigation();
  initSidebarNavigation();
  initFoodRatings();
});

// ============================================================
//   音乐播放器
// ============================================================

function initMusicPlayer() {
  bgAudio = document.getElementById('bgMusic');
  if (!bgAudio) return;

  // 恢复音量
  var vol = parseFloat(localStorage.getItem(STORE_KEYS.volume) || '0.3');
  bgAudio.volume = vol;

  // 恢复曲目
  var si = localStorage.getItem(STORE_KEYS.track);
  if (si !== null) currentTrackIndex = Math.min(parseInt(si, 10), MUSIC_TRACKS.length - 1);

  // 加载曲目
  bgAudio.src = MUSIC_TRACKS[currentTrackIndex].src;
  bgAudio.load();

  // 进度恢复：等元数据就绪后设置 currentTime
  var savedTime = localStorage.getItem(STORE_KEYS.time);
  if (savedTime !== null) {
    var targetTime = parseFloat(savedTime);
    function seek() {
      if (bgAudio.readyState >= 1) {
        bgAudio.currentTime = targetTime;
      } else {
        bgAudio.addEventListener('loadedmetadata', function once() {
          bgAudio.currentTime = targetTime;
        }, { once: true });
      }
    }
    try { bgAudio.currentTime = targetTime; } catch(e) {
      bgAudio.addEventListener('loadedmetadata', function once() {
        bgAudio.currentTime = targetTime;
      }, { once: true });
    }
  }

  // 自动恢复播放
  var wasPlaying = localStorage.getItem(STORE_KEYS.playing);
  if (wasPlaying !== 'false') {
    bgAudio.play().catch(function () {});
  }

  // 定期保存进度
  setInterval(function () {
    if (!bgAudio.paused && bgAudio.currentTime > 0) {
      localStorage.setItem(STORE_KEYS.time, bgAudio.currentTime);
    }
  }, 1000);

  // 曲目结束自动切下一首
  bgAudio.addEventListener('ended', function () {
    var next = (currentTrackIndex + 1) % MUSIC_TRACKS.length;
    switchTrack(next);
  });

  // 错误时切下一首
  bgAudio.addEventListener('error', function () {
    var next = (currentTrackIndex + 1) % MUSIC_TRACKS.length;
    switchTrack(next);
  });

  // 绑定页面上的播放控件
  bindMusicControls();
}

function bindMusicControls() {
  if (!bgAudio) return;

  var playBtn    = document.getElementById('playBtn');
  var muteBtn    = document.getElementById('muteBtn');
  var volSlider  = document.getElementById('volumeSlider');
  var volVal     = document.getElementById('volumeValue');
  var prevBtn    = document.getElementById('prevBtn');
  var nextBtn    = document.getElementById('nextBtn');

  if (playBtn)   playBtn.textContent   = bgAudio.paused ? '▶' : '⏸';
  if (muteBtn)   muteBtn.textContent   = bgAudio.muted  ? '🔇' : '🔊';
  if (volSlider) volSlider.value       = bgAudio.volume * 100;
  if (volVal)    volVal.textContent    = Math.round(bgAudio.volume * 100) + '%';

  if (playBtn) {
    playBtn.onclick = function () {
      if (bgAudio.paused) {
        bgAudio.play();
        playBtn.textContent = '⏸';
        localStorage.setItem(STORE_KEYS.playing, 'true');
      } else {
        bgAudio.pause();
        playBtn.textContent = '▶';
        localStorage.setItem(STORE_KEYS.playing, 'false');
      }
    };
  }

  if (muteBtn) {
    muteBtn.onclick = function () {
      bgAudio.muted = !bgAudio.muted;
      muteBtn.textContent = bgAudio.muted ? '🔇' : '🔊';
    };
  }

  if (volSlider) {
    volSlider.oninput = function (e) {
      var v = e.target.value / 100;
      bgAudio.volume = v;
      localStorage.setItem(STORE_KEYS.volume, v);
      var vv = document.getElementById('volumeValue');
      if (vv) vv.textContent = Math.round(v * 100) + '%';
    };
  }

  if (prevBtn) prevBtn.onclick = function () {
    switchTrack((currentTrackIndex - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length);
  };
  if (nextBtn) nextBtn.onclick = function () {
    switchTrack((currentTrackIndex + 1) % MUSIC_TRACKS.length);
  };

  updateTrackDisplay();
  updateMusicPageUI();
}

function switchTrack(index) {
  if (!bgAudio) return;
  bgAudio.src = MUSIC_TRACKS[index].src;
  bgAudio.load();
  currentTrackIndex = index;
  localStorage.setItem(STORE_KEYS.track, index);
  localStorage.setItem(STORE_KEYS.time, '0');
  localStorage.setItem(STORE_KEYS.playing, 'true');
  bgAudio.play().catch(function () {});
  updateTrackDisplay();
  updateMusicPageUI();
  var btn = document.getElementById('playBtn');
  if (btn) btn.textContent = '⏸';
}

function updateTrackDisplay() {
  var t = MUSIC_TRACKS[currentTrackIndex];
  var el = document.getElementById('nowPlaying');
  if (el) el.textContent = t.title + ' - ' + t.artist;
}

function updateMusicPageUI() {
  var list = document.getElementById('musicPlaylist');
  if (!list) return;

  list.innerHTML = '';
  MUSIC_TRACKS.forEach(function (track, i) {
    var item = document.createElement('div');
    item.className = 'playlist-item' + (i === currentTrackIndex ? ' active' : '');
    item.setAttribute('data-index', i);
    item.innerHTML =
      '<span class="playlist-num">' + (i + 1) + '</span>' +
      '<div class="playlist-info">' +
        '<div class="playlist-title">' + track.title + '</div>' +
        '<div class="playlist-artist">' + track.artist + '</div>' +
      '</div>' +
      '<span class="playlist-status">' + (i === currentTrackIndex ? '♫ 播放中' : '') + '</span>';
    item.addEventListener('click', function () {
      switchTrack(parseInt(this.getAttribute('data-index'), 10));
    });
    list.appendChild(item);
  });
}

// ============================================================
//   导航高亮
// ============================================================

function initNavigation() {
  var page = location.pathname.split('/').pop().replace('.html', '') || 'index';

  document.querySelectorAll('.nav-link').forEach(function (link) {
    var lp = link.getAttribute('data-page') || 'index';
    link.classList.toggle('active', lp === page);
  });
}

// ============================================================
//   侧边栏与内容切换
// ============================================================

function initSidebarNavigation() {
  // LoongArch 侧边栏
  bindSidebar(
    document.querySelectorAll('#topicsList li'),
    'data-topic'
  );

  // 工具箱 侧边栏
  var toolItems = document.querySelectorAll('#toolboxList li');
  if (toolItems.length > 0) {
    toolItems.forEach(function (item) {
      item.addEventListener('click', function () {
        var tool = item.getAttribute('data-tool');
        toolItems.forEach(function (t) { t.classList.remove('active'); });
        item.classList.add('active');
        document.querySelectorAll('#eth-content, #uart-content, #debug-content, #flash-content, #monitor-content').forEach(function (c) {
          c.style.display = 'none';
        });
        var tgt = document.getElementById(tool + '-content');
        if (tgt) tgt.style.display = 'block';
      });
    });
  }

  // 美食切换
  var fd = document.querySelectorAll('#foodList li');
  fd.forEach(function (t) {
    t.addEventListener('click', function () {
      var key = t.getAttribute('data-food');
      fd.forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
      document.querySelectorAll('.food-section').forEach(function (sec) {
        sec.classList.toggle('active', sec.id === key + '-content');
      });
    });
  });

  // CANN / 仓颉 / ArkTs 侧边栏导航
  ['cannNavList', 'cangjieNavList', 'arktsNavList'].forEach(function (listId) {
    var items = document.querySelectorAll('#' + listId + ' li');
    if (!items.length) return;
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        var section = item.getAttribute('data-section');
        items.forEach(function (x) { x.classList.remove('active'); });
        item.classList.add('active');

        var area = item.closest('.sidebar-layout');
        if (!area) return;
        var contentArea = area.querySelector('.content-area');
        if (!contentArea) return;

        contentArea.querySelectorAll('.content-section').forEach(function (sec) {
          sec.style.display = 'none';
          sec.classList.remove('active');
        });
        var target = document.getElementById(section + '-content');
        if (target) {
          target.style.display = 'block';
          target.classList.add('active');
        }
      });
    });
  });
}

function bindSidebar(items, attr) {
  if (!items.length) return;
  items.forEach(function (item) {
    item.addEventListener('click', function () {
      var key = item.getAttribute(attr);
      items.forEach(function (x) { x.classList.remove('active'); });
      item.classList.add('active');

      document.querySelectorAll('.content-section, [id$="-content"]').forEach(function (sec) {
        var match = sec.id === key + '-content';
        sec.style.display = match ? 'block' : 'none';
        sec.classList.toggle('active', match);
      });
    });
  });
}

// ============================================================
//   美食评分
// ============================================================

function initFoodRatings() {
  document.querySelectorAll('.star').forEach(function (star) {
    star.addEventListener('click', function () {
      var row = this.parentElement;
      var stars = row.querySelectorAll('.star');
      var idx = Array.prototype.indexOf.call(stars, this);
      stars.forEach(function (s, i) {
        s.textContent = i <= idx ? '★' : '☆';
        s.style.color = i <= idx ? 'var(--accent-cyan)' : 'var(--text-muted)';
      });
    });
  });
}
