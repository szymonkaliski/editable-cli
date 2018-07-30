def(
  "intro",
  md => md`
# defn-cli

## interactive notebooks powered by @observablehq
  `
);

// def("start", now => new Date());

def("d3", require => require("d3"));

def("range", d3 => d3.range(100));

def("deepObj", {
  x: [1, 2, 3],
  asd: { a: 2 }
});

def("deepArray", [[1, 2], [2, 3]]);
