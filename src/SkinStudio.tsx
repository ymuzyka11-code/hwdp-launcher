import { useEffect, useMemo, useState } from "react";

type Avatar = { id: string; name: string; dataUrl?: string; preset?: string };
type SavedSkin = { id: string; name: string; dataUrl: string; savedAt: number };

const PRESETS = [
  { id: "steve", name: "Steve", glyph: "🧑🏻‍🌾", color: "#3977a8" },
  { id: "alex", name: "Alex", glyph: "🧑🏻", color: "#b66b45" },
  { id: "creeper", name: "Creeper", glyph: "🟩", color: "#397c43" },
  { id: "enderman", name: "Enderman", glyph: "👾", color: "#30243f" },
  { id: "zombie", name: "Zombie", glyph: "🧟", color: "#477d58" },
  { id: "skeleton", name: "Skeleton", glyph: "💀", color: "#a9a69a" },
  { id: "pig", name: "Pig", glyph: "🐷", color: "#b77b83" },
  { id: "villager", name: "Villager", glyph: "🧑🏽", color: "#92704f" },
  { id: "snow-golem", name: "Snow Golem", glyph: "☃️", color: "#8ba9b8" },
];

const readStored = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

export default function SkinStudio() {
  const [skin, setSkin] = useState<SavedSkin | null>(() => readStored("hwdp.skin.current", null));
  const [skins, setSkins] = useState<SavedSkin[]>(() => readStored("hwdp.skin.library", []));
  const [avatars, setAvatars] = useState<Avatar[]>(() => readStored("hwdp.avatar.library", []));
  const [selectedAvatar, setSelectedAvatar] = useState("steve");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    localStorage.setItem("hwdp.skin.current", JSON.stringify(skin));
  }, [skin]);
  useEffect(() => {
    localStorage.setItem("hwdp.skin.library", JSON.stringify(skins));
  }, [skins]);
  useEffect(() => {
    localStorage.setItem("hwdp.avatar.library", JSON.stringify(avatars));
  }, [avatars]);

  const activeAvatar = useMemo(
    () => avatars.find((avatar) => avatar.id === selectedAvatar),
    [avatars, selectedAvatar],
  );

  async function readImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Nie udało się odczytać pliku."));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
  }

  async function importSkin(file?: File) {
    if (!file) return;
    setError("");
    setNotice("");
    if (!file.type.includes("png")) {
      setError("Skin Minecrafta musi być plikiem PNG.");
      return;
    }
    try {
      const dataUrl = await readImage(file);
      const image = new Image();
      image.onload = () => {
        if (!((image.width === 64 && image.height === 64) || (image.width === 64 && image.height === 32))) {
          setError("Nieprawidłowy rozmiar. Obsługiwane tekstury: 64×64 lub klasyczne 64×32 PNG.");
          return;
        }
        const next = { id: crypto.randomUUID(), name: file.name, dataUrl, savedAt: Date.now() };
        setSkin(next);
        setSelectedAvatar("skin-current");
        setNotice("Skin wczytany. Zapisz go w bibliotece, aby zachować go na później.");
      };
      image.onerror = () => setError("Plik PNG nie zawiera prawidłowej tekstury obrazu.");
      image.src = dataUrl;
    } catch (cause) {
      setError(String(cause));
    }
  }

  async function importAvatar(file?: File) {
    if (!file) return;
    setError("");
    try {
      const dataUrl = await readImage(file);
      const image = new Image();
      image.onload = () => {
        if (image.width > 1024 || image.height > 1024) {
          setError("Awatar może mieć maksymalnie 1024×1024 px.");
          return;
        }
        const avatar = { id: crypto.randomUUID(), name: file.name, dataUrl };
        setAvatars((current) => [avatar, ...current]);
        setSelectedAvatar(avatar.id);
        setNotice("Dodano awatar do biblioteki.");
      };
      image.onerror = () => setError("Nieprawidłowy plik obrazu.");
      image.src = dataUrl;
    } catch (cause) {
      setError(String(cause));
    }
  }

  function saveSkin() {
    if (!skin) return;
    setSkins((current) => [skin, ...current.filter((item) => item.id !== skin.id)]);
    setNotice("Skin zapisany w bibliotece.");
  }

  function selectSavedSkin(item: SavedSkin) {
    setSkin(item);
    setSelectedAvatar("skin-current");
    setNotice("Wybrano zapisany skin.");
  }

  function addSkinAsAvatar() {
    if (!skin) return;
    const avatar = { id: crypto.randomUUID(), name: skin.name, dataUrl: skin.dataUrl };
    setAvatars((current) => [avatar, ...current]);
    setSelectedAvatar(avatar.id);
    setNotice("Dodano głowę z tekstury skina do biblioteki awatarów.");
  }

  return (
    <section className="skin-studio">
      <header className="skin-studio-header">
        <div>
          <p className="skin-eyebrow">PERSONALIZACJA POSTACI</p>
          <h1>Studio skinów</h1>
          <p className="skin-muted">Wczytuj klasyczne tekstury Minecrafta, przechowuj swoje skiny i wybieraj awatar launchera.</p>
        </div>
        <label className="skin-primary-button">
          <span>＋ Importuj skin PNG</span>
          <input type="file" accept="image/png,.png" onChange={(event) => { void importSkin(event.target.files?.[0]); event.currentTarget.value = ""; }} />
        </label>
      </header>

      {error && <div className="skin-message skin-error" role="alert">{error}</div>}
      {notice && <div className="skin-message skin-success" role="status">{notice}</div>}

      <div className="skin-studio-grid">
        <article className="skin-panel skin-preview-panel">
          <div className="skin-panel-heading"><div><span className="skin-eyebrow">PODGLĄD</span><h2>Aktualny skin</h2></div><span className="skin-format">PNG · 64 px</span></div>
          {skin ? (
            <>
              <div className="skin-texture-stage">
                <img src={skin.dataUrl} alt={`Tekstura skina ${skin.name}`} />
              </div>
              <div className="skin-file-name">{skin.name}</div>
              <div className="skin-actions">
                <button className="skin-primary-button" onClick={saveSkin}>Zapisz w bibliotece</button>
                <button className="skin-secondary-button" onClick={addSkinAsAvatar}>Dodaj do awatarów</button>
              </div>
            </>
          ) : (
            <div className="skin-empty-preview"><div className="skin-empty-icon">▦</div><strong>Nie wybrano skina</strong><span>Zaimportuj teksturę PNG 64×64 lub 64×32, aby zobaczyć podgląd.</span></div>
          )}
          <div className="skin-hint">To podgląd arkusza tekstury, nie model 3D. Import nie zmienia automatycznie skina na koncie Microsoft.</div>
        </article>

        <article className="skin-panel">
          <div className="skin-panel-heading"><div><span className="skin-eyebrow">TWOJA KOLEKCJA</span><h2>Zapisane skiny</h2></div><span className="skin-count">{skins.length}</span></div>
          {skins.length ? <div className="skin-saved-list">{skins.map((item) => (
            <div className="skin-saved-item" key={item.id}>
              <img src={item.dataUrl} alt="" />
              <button className="skin-saved-name" onClick={() => selectSavedSkin(item)}>{item.name}<small>{new Date(item.savedAt).toLocaleDateString()}</small></button>
              <button className="skin-remove" aria-label={`Usuń ${item.name}`} onClick={() => setSkins((current) => current.filter((entry) => entry.id !== item.id))}>×</button>
            </div>
          ))}</div> : <p className="skin-empty-copy">Twoja biblioteka jest pusta. Wczytaj skin i wybierz „Zapisz w bibliotece”.</p>}
        </article>
      </div>

      <article className="skin-panel skin-avatar-panel">
        <div className="skin-panel-heading">
          <div><span className="skin-eyebrow">PROFIL LAUNCHERA</span><h2>Biblioteka awatarów</h2><p className="skin-muted">Wybierz jeden z 9 awatarów w stylu Minecrafta albo dodaj własny obraz.</p></div>
          <label className="skin-secondary-button">＋ Dodaj awatar<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { void importAvatar(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
        </div>
        <div className="skin-avatar-grid">
          {PRESETS.map((avatar) => <button key={avatar.id} className={`skin-avatar-choice ${selectedAvatar === avatar.id ? "is-selected" : ""}`} onClick={() => setSelectedAvatar(avatar.id)}>
            <span className="skin-avatar-art" style={{ background: avatar.color }}>{avatar.glyph}</span><span>{avatar.name}</span>
          </button>)}
          {skin && <button className={`skin-avatar-choice ${selectedAvatar === "skin-current" ? "is-selected" : ""}`} onClick={() => setSelectedAvatar("skin-current")}><span className="skin-avatar-art skin-avatar-texture" style={{ backgroundImage: `url(${skin.dataUrl})` }} /><span>{skin.name}</span></button>}
          {avatars.map((avatar) => <div key={avatar.id} role="button" tabIndex={0} className={`skin-avatar-choice ${selectedAvatar === avatar.id ? "is-selected" : ""}`} onClick={() => setSelectedAvatar(avatar.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedAvatar(avatar.id); }}>
            <img className="skin-avatar-art" src={avatar.dataUrl} alt="" /><span title={avatar.name}>{avatar.name}</span>
            <button className="skin-avatar-delete" aria-label={`Usuń awatar ${avatar.name}`} onClick={(event) => { event.stopPropagation(); setAvatars((current) => current.filter((item) => item.id !== avatar.id)); if (selectedAvatar === avatar.id) setSelectedAvatar("steve"); }}>×</button>
          </div>)}
        </div>
        <div className="skin-selected-avatar"><span>Wybrany awatar</span><strong>{activeAvatar?.name ?? (selectedAvatar === "skin-current" ? skin?.name : PRESETS.find((item) => item.id === selectedAvatar)?.name ?? "Steve")}</strong></div>
      </article>
    </section>
  );
}
