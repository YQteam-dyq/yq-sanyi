const rows = [
  ['first-interactive', '<= 1000 ms', 'pending'],
  ['update-latency', '<= 200 ms', 'pending'],
  ['scroll-fps', '>= 55 fps', 'pending'],
];
for (const [name, target, value] of rows) {
  console.log('bench ' + name + ' target ' + target + ' measured ' + value);
}
console.log('bench harness placeholder ok: real measurements land with the render pipeline in Phase 4 and Phase 7');
