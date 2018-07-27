def(
  "intro",
  md => md`
# defn-cli

## interactive notebooks powered by @observablehq
  `
);

def("start", new Date());

def("d3", require => require("d3"));

def("range", d3 => d3.range(100));
