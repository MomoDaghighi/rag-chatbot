export function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
export function norm(a: number[]) {
  let s = 0;
  for (const v of a) s += v * v;
  return Math.sqrt(s);
}
export function cosine(a: number[], b: number[]) {
  const n = norm(a) * norm(b);
  if (n === 0) return 0;
  return dot(a, b) / n;
}
