// def("sum", ["a", "b"], (a, b) => a + b);

// def("a", 5);

// def("b", 90 / 10);

// def("d3.array", ["require"], require => require("d3-array"));

// def("x", ["d3.array", "a"], (array, a) => array.range(a));

// def("y", ["d3.array", "sum"], (array, sum) => array.range(sum));

// def("z", ["a"], a => a * -2);

def("tick", ["Promises"], function*(Promises) {
  let i = 0;

  yield i;

  while (true) {
    yield Promises.delay(1000, ++i);
  }
});

def("i", ["tick"], () => new Date());

// def("date-fns", ["require"], require => require("date-fns"));

// def("test1", ["date-fns"], ({ parse }) => parse("asd"));
