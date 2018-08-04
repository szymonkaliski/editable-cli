def(
  "text",
  `SK 19/17
Data wydania:2018-06-19
Dz.U. 2018 r. poz. 1241
Data ogłoszenia:2018-06-27`
);

def("matchBasic", text => text.match(/(\d{4})-(\d{2})-(\d{2})/));

def("matchGlobal", text => text.match(/(\d{4})-(\d{2})-(\d{2})/g));
