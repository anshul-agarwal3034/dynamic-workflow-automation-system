const EmbedModal = ({ isOpen, form, shareUrl, onClose, generating }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = React.useState('link'); // 'link' | 'qr'
  const [copied, setCopied] = React.useState(false);
  const qrContainerRef = React.useRef(null);

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2500);
  };

  // Render QR Code via QRCodeJS
  React.useEffect(() => {
    if (activeTab === 'qr' && shareUrl && qrContainerRef.current) {
      qrContainerRef.current.innerHTML = '';
      if (typeof window.QRCode !== 'undefined') {
        try {
          new window.QRCode(qrContainerRef.current, {
            text: shareUrl,
            width: 180,
            height: 180,
            colorDark: '#121316',
            colorLight: '#FFFFFF',
            correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.H : 2
          });
        } catch (err) {
          console.warn('[EmbedModal] QRCode generation failed:', err);
        }
      }
    }
  }, [activeTab, shareUrl]);

  const downloadQr = () => {
    if (!qrContainerRef.current) return;
    const canvas = qrContainerRef.current.querySelector('canvas');
    let dataUrl = '';
    if (canvas) {
      dataUrl = canvas.toDataURL('image/png');
    } else {
      const img = qrContainerRef.current.querySelector('img');
      if (img && img.src) {
        dataUrl = img.src;
      }
    }

    if (!dataUrl) return;

    const link = document.createElement('a');
    const safeTitle = (form?.title || 'form').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${safeTitle}-qrcode.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#1A1D24] border border-[#2A2D35] rounded-2xl p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2A2D35]">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[#E2B858]">share</span>
            Share Form
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8E929C] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 my-4 p-1 bg-[#121316] rounded-xl border border-[#2A2D35]/60">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'link'
                ? 'bg-[#E2B858] text-black'
                : 'text-[#8E929C] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">link</span>
            Direct Link
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'qr'
                ? 'bg-[#E2B858] text-black'
                : 'text-[#8E929C] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">qr_code_2</span>
            QR Code
          </button>
        </div>

        {/* Tab Panels */}
        {activeTab === 'link' ? (
          <div className="space-y-4">
            <label className="text-xs font-medium text-[#8E929C] block">
              Public Form URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 min-w-0 bg-[#121316] border border-[#2A2D35] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#E2B858]"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 bg-[#252830] hover:bg-[#2F333E] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
                title="Copy link"
              >
                <span className="material-symbols-outlined text-sm">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-[#E2B858] hover:bg-[#D4A747] text-black text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
                title="Open form in new tab"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                <span>Open</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            <div id="qr-code-container" ref={qrContainerRef} className="p-3 bg-white rounded-xl shadow-lg flex items-center justify-center">
              {/* Live QR element */}
            </div>
            <button
              type="button"
              onClick={downloadQr}
              className="px-4 py-2 bg-[#E2B858] text-black text-xs font-semibold rounded-xl hover:bg-[#D4A747] transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Download QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

window.EmbedModal = EmbedModal;
