// Frame-local, roll-aware jaw balance. Never mirror facial features.
// Classic worker script; no additional model or inference pass.
self.cheekBalance = (points, aspect = 1) => {
  const empty = { pulls: new Array(8).fill(0), radius: 0 };
  if (!points || !Number.isFinite(aspect) || aspect <= 0) return empty;
  const ids = [33, 263, 1, 168, 152, 172, 397];
  if (ids.some(i => !points[i] || !Number.isFinite(points[i].x + points[i].y + points[i].z))) return empty;
  const p = i => [points[i].x * aspect, points[i].y];
  const a = p(168), chin = p(152), l = p(33), r = p(263), nose = p(1);
  const height = Math.hypot(chin[0]-a[0], chin[1]-a[1]);
  const width = Math.hypot(r[0]-l[0], r[1]-l[1]);
  if (height < .08 || width < .06) return empty;
  const axis = [(chin[1]-a[1])/height, -(chin[0]-a[0])/height];
  const project = q => (q[0]-a[0])*axis[0]+(q[1]-a[1])*axis[1];
  // Depth/centering gates fade to zero for yaw and strong perspective.
  const yaw = Math.max(Math.abs(points[33].z-points[263].z)*aspect/width,
    Math.abs(project(nose))/width);
  const gate = Math.max(0, Math.min(1, (.16-yaw)/.10));
  const left = p(172), right = p(397), dl = project(left), dr = project(right);
  if (dl * dr >= 0 || Math.abs(dl + dr) > width * .30 || gate === 0) return empty;
  const difference = (dl + dr) / 2;
  const magnitude = Math.max(0, Math.abs(difference)-width*.008);
  const correction = Math.sign(difference)*Math.min(magnitude*.25,width*.018)*gate;
  // Inverse sampling offset; each current-frame anchor moves toward balance.
  const dx = correction*axis[0]/aspect, dy = correction*axis[1];
  return { pulls: [left[0]/aspect,left[1],dx,dy,right[0]/aspect,right[1],dx,dy], radius: width*.45 };
};
