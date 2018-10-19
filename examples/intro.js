def(
  "intro",
  md => md`
# editable-cli

## interactive notebooks powered by @observablehq
  `
);

def("range", d3 => d3.range(100));

def("deepObj", { a: [1, 2, 3], b: { c: 2 } });

def("deepArray", [[1, 2], [2, 3]]);

def("d3", require => require("d3"));

