// SeaNergy V2 enclosure model - millimetres
// PRELIMINARY: review seal gland and penetrator geometry before fabrication.
$fn = 128;
outer_x = 168;
outer_y = 210;
outer_z = 40;
wall = 4;
cap_od = 126;
cap_thickness = 7;
oring_id = 113.89;
oring_cs = 3.53;
groove_depth = 2.82;
groove_width = 4.80;

module rounded_box(x,y,z,r) {
  hull() for (sx=[-1,1], sy=[-1,1])
    translate([sx*(x/2-r), sy*(y/2-r), 0]) cylinder(h=z,r=r);
}

module shell() {
  difference() {
    rounded_box(outer_x, outer_y, outer_z, 18);
    translate([0,0,wall]) rounded_box(outer_x-2*wall, outer_y-2*wall, outer_z, 14);
    translate([0,0,-1]) cylinder(h=wall+2,d=cap_od);
  }
}

module cap() {
  difference() {
    cylinder(h=cap_thickness,d=cap_od);
    translate([0,0,cap_thickness-groove_depth])
      difference() {
        cylinder(h=groove_depth+0.1,d=oring_id+2*oring_cs+0.05);
        cylinder(h=groove_depth+0.2,d=oring_id+2*oring_cs-groove_width*2);
      }
    for(a=[0:30:330]) translate([69*cos(a),69*sin(a),-1]) cylinder(h=cap_thickness+2,d=3.4);
  }
}

shell();
translate([0,0,outer_z+5]) cap();
