import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { barcodesAPI } from '../../services/api';
import { getApiError } from '../auth/auth.api';
import '../../styles/commerce.css';

const types = ['customer', 'order', 'inventory'];

export default function BarcodesPage() {
  const video = useRef(null);
  const stream = useRef(null);
  const scanning = useRef(false);
  const [type, setType] = useState('order');
  const [recordId, setRecordId] = useState('');
  const [format, setFormat] = useState('qr');
  const [code, setCode] = useState('');
  const [cameraMessage, setCameraMessage] = useState('');
  const generate = useMutation({
    mutationFn: async () => {
      const response = await barcodesAPI.generate(type, recordId, format);
      return { svg: response.data, code: response.headers['x-barcode-value'] };
    },
  });
  const resolve = useMutation({ mutationFn: async (value) => (await barcodesAPI.resolve(value)).data.record });

  useEffect(() => () => {
    scanning.current = false;
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const startCamera = async () => {
    setCameraMessage('');
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
      setCameraMessage('Camera scanning is not supported here. Connect a USB scanner or scan the label and enter its value below.');
      return;
    }
    try {
      const available = await window.BarcodeDetector.getSupportedFormats();
      const formats = ['qr_code', 'code_128'].filter((item) => available.includes(item));
      if (!formats.length) throw new Error('This browser cannot scan QR codes or Code 128 barcodes.');
      const detector = new window.BarcodeDetector({ formats });
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.current.srcObject = stream.current;
      await video.current.play();
      scanning.current = true;
      setCameraMessage('Point the camera at a TailorOS QR code or barcode.');
      const readFrame = async () => {
        if (!scanning.current || !video.current) return;
        try {
          const hits = await detector.detect(video.current);
          if (hits[0]?.rawValue) {
            const value = hits[0].rawValue;
            setCode(value);
            scanning.current = false;
            stream.current?.getTracks().forEach((track) => track.stop());
            resolve.mutate(value);
            setCameraMessage('Code scanned.');
            return;
          }
        } catch (error) {
          setCameraMessage(error.message || 'Unable to read this barcode.');
          scanning.current = false;
          stream.current?.getTracks().forEach((track) => track.stop());
          return;
        }
        window.requestAnimationFrame(readFrame);
      };
      window.requestAnimationFrame(readFrame);
    } catch (error) {
      setCameraMessage(error.message || 'Unable to start the camera.');
      scanning.current = false;
      stream.current?.getTracks().forEach((track) => track.stop());
    }
  };

  return <main className="commerce-page">
    <header className="commerce-header"><div><p className="section-kicker">Workshop tools</p><h1>Barcodes &amp; QR codes</h1><p>Print tenant-bound labels and resolve them with a camera or handheld scanner.</p></div></header>
    <section className="commerce-form commerce-wide-form">
      <h2>Create a label</h2>
      <label>Record type<select value={type} onChange={(event) => setType(event.target.value)}>{types.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
      <label>Record ID<input required value={recordId} onChange={(event) => setRecordId(event.target.value)} autoComplete="off" /></label>
      <label>Format<select value={format} onChange={(event) => setFormat(event.target.value)}><option value="qr">QR code</option><option value="barcode">Code 128 barcode</option></select></label>
      <button className="commerce-primary commerce-fit" type="button" disabled={!recordId || generate.isPending} onClick={() => generate.mutate()}>{generate.isPending ? 'Generating…' : 'Generate label'}</button>
      {generate.error && <div className="commerce-alert" role="alert">{getApiError(generate.error, 'Unable to generate label')}</div>}
      {generate.data && <div className="commerce-summary"><img alt={`${format} label for ${type}`} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(generate.data.svg)}`} /><p>{generate.data.code}</p><button type="button" className="commerce-secondary commerce-fit" onClick={() => window.print()}>Print label</button></div>}
    </section>
    <section className="commerce-form commerce-wide-form">
      <h2>Scan a label</h2>
      <p>Use the camera where supported, or a USB/Bluetooth scanner that types into the code field.</p>
      <button className="commerce-secondary commerce-fit" type="button" onClick={startCamera} disabled={resolve.isPending}>Start camera scan</button>
      <video ref={video} className="commerce-scanner-video" muted playsInline aria-label="Barcode camera preview" />
      {cameraMessage && <p role="status">{cameraMessage}</p>}
      <label>Scanned code<input value={code} onChange={(event) => setCode(event.target.value)} onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          resolve.mutate(code);
        }
      }} autoComplete="off" /></label>
      <button className="commerce-primary commerce-fit" type="button" disabled={!code || resolve.isPending} onClick={() => resolve.mutate(code)}>{resolve.isPending ? 'Looking up…' : 'Find record'}</button>
      {resolve.error && <div className="commerce-alert" role="alert">{getApiError(resolve.error, 'Unable to resolve code')}</div>}
      {resolve.data && <div className="commerce-summary"><h3>{resolve.data.label}</h3><p>Type: {resolve.data.type}</p><p>Status: {resolve.data.data.status || '—'}</p></div>}
    </section>
  </main>;
}
