def("tick", function*(Promises) {
  let i = 0;

  yield i;

  while (true) {
    yield Promises.delay(1000, ++i);
  }
});

def("date", tick => new Date());

def("someHtml", date => ["h4", `now: ${date.getTime()}`]);

