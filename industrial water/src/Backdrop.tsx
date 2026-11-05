/**
 * Full-screen photo background that is never cropped: the whole photo is shown, and a tiny pre-blurred copy
 * (scaled up, so it costs almost nothing to draw) fills any space around it.
 */
export default function Backdrop({ src }: { src: string }) {
  return (
    <div className="bd" aria-hidden>
      <img className="bd-blur" src={src.replace(".jpg", "-blur.jpg")} alt="" />
      <img className="bd-main" src={src} alt="" />
      <div className="bd-shade" />
    </div>
  );
}
