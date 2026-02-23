import React, {useState, useEffect} from 'react';

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    margin: '1rem 0',
  },
  cell: {
    cursor: 'pointer',
  },
  thumb: {
    width: '100%',
    borderRadius: '8px',
    display: 'block',
  },
  caption: {
    textAlign: 'center',
    marginTop: '0.5rem',
    fontSize: '0.9rem',
    color: 'var(--ifm-color-content-secondary)',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    cursor: 'pointer',
  },
  box: {
    maxWidth: '95vw',
    maxHeight: '95vh',
    backgroundColor: 'var(--ifm-background-color)',
    borderRadius: '12px',
    padding: '0.5rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    cursor: 'default',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  boxImage: {
    maxWidth: '90vw',
    maxHeight: '85vh',
    objectFit: 'contain',
    borderRadius: '8px',
  },
  boxCaption: {
    marginTop: '0.75rem',
    fontSize: '0.95rem',
    color: 'var(--ifm-font-color-base)',
  },
  close: {
    alignSelf: 'flex-end',
    marginBottom: '0.25rem',
    padding: '0.25rem 0.5rem',
    fontSize: '1.25rem',
    lineHeight: 1,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--ifm-color-content-secondary)',
    borderRadius: '4px',
  },
};

export default function ImageLightbox({images}) {
  const [openIndex, setOpenIndex] = useState(null);

  const close = () => setOpenIndex(null);

  useEffect(() => {
    if (openIndex === null) return;
    const onEscape = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEscape);
      document.body.style.overflow = '';
    };
  }, [openIndex]);

  if (!images || !images.length) return null;

  const openImage = images[openIndex];

  return (
    <>
      <div style={styles.grid}>
        {images.map((img, i) => (
          <div key={i} style={styles.cell} onClick={() => setOpenIndex(i)}>
            <img
              src={img.src}
              alt={img.alt}
              style={styles.thumb}
              loading="lazy"
            />
            {img.caption && <p style={styles.caption}>{img.caption}</p>}
          </div>
        ))}
      </div>

      {openIndex !== null && openImage && (
        <div
          style={styles.overlay}
          onClick={(e) => e.target === e.currentTarget && close()}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox">
          <div style={styles.box} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              style={styles.close}
              onClick={close}
              aria-label="Close">
              ×
            </button>
            <img
              src={openImage.src}
              alt={openImage.alt}
              style={styles.boxImage}
            />
            {openImage.caption && (
              <p style={styles.boxCaption}>{openImage.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
