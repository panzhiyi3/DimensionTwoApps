let win = require('electron').remote.getCurrentWindow();

window.addEventListener('mousemove', function(e) {
  if (e.target === document.documentElement)
    win.setIgnoreMouseEvents(true, {forward: true});
  else
    win.setIgnoreMouseEvents(false);
});
