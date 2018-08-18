def("canvas", (DOM, W, H) => DOM.canvas(W, H));

def("h", DOM => DOM.range(100, 400));
def("w", DOM => DOM.range(100, 400));
def("s", DOM => DOM.range(1, 100));

def("anim", (canvas, tick, W, H, speed) => {
  const ctx = canvas.getContext("2d");

  const r = 20;
  const g = 90;
  const b = Math.abs(Math.sin(tick / speed) * 255);

  const fillStyle = `rgb(${r}, ${g}, ${b})`;

  ctx.fillStyle = fillStyle;

  ctx.fillRect(0, 0, W, H);
});

def("H", (h, Generators) => Generators.input(h));
def("W", (w, Generators) => Generators.input(w));
def("speed", (s, Generators) => Generators.input(s));

def("tick", function*(Promises) {
  let i = 0;

  yield i;

  while (true) {
    yield Promises.delay(10, ++i);
  }
});

