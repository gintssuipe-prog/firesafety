// scenes/Finish.js
// Finish + Score vienā scenā (TOP50 + vārda ievade tikai TOPā)

class Finish extends Phaser.Scene {
  constructor() {
    super("Finish");
  }

  init(data) {
    this.result = data || {};
    this._saved = false;
    this._top = null;
    this._myRank = null;

    // IMPORTANT: pilnais URL (nekādu "...")
    this.API_URL =
      "https://script.google.com/macros/s/AKfycbyh6BcVY_CBPW9v7SNo1bNp_XttvhxpeSdYPfrTdRCD4KWXLeLvv-0S3p96PX0Dv5BnrA/exec";
    this.TOKEN = "FIRE2025";
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // fons
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.25);

    // header
    const success = !!this.result.success;
    const title = success ? "MISIJA IR IZPILDĪTA!" : "MISIJA NAV PABEIGTA!";
    this.add
      .text(W / 2, 70, title, {
        fontFamily: "Arial",
        fontSize: "34px",
        fontStyle: "700",
        color: "#FFFFFF",
      })
      .setOrigin(0.5);

    const timeText = this._formatTime(this.result.timeSeconds || this.result.timeSec || 0);
    this.add
      .text(W / 2, 112, `Tavs laiks: ${timeText}`, {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#EAEAEA",
      })
      .setOrigin(0.5);

    // zona saglabāšanai (fiksēta, neskrollējas)
    this._saveRowY = 155;
    this._tableTopY = 195;

    this._msg = this.add
      .text(W / 2, this._saveRowY - 28, "", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#F1F1F1",
      })
      .setOrigin(0.5);

    // tabulas ģeometrija
    this._tableX = Math.round(W * 0.10);
    this._tableW = Math.round(W * 0.80);
    this._tableH = Math.round(H * 0.58);
    this._rowH = 28;

    // kolonnas (vienkārši un salasāmi)
    this._colRankX = this._tableX + 10;
    this._colNameX = this._tableX + Math.round(this._tableW * 0.22);
    this._colTimeX = this._tableX + this._tableW - 10;

    // header rinda (fiksēta)
    this._headerBg = this.add.rectangle(
      this._tableX + this._tableW / 2,
      this._tableTopY,
      this._tableW,
      28,
      0xffffff,
      0.10
    );

    this.add
      .text(this._colRankX, this._tableTopY, "Vieta", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#FFFFFF",
      })
      .setOrigin(0, 0.5);

    this.add
      .text(this._colNameX, this._tableTopY, "Vārds", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#FFFFFF",
      })
      .setOrigin(0, 0.5);

    this.add
      .text(this._colTimeX, this._tableTopY, "Laiks", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#FFFFFF",
      })
      .setOrigin(1, 0.5);

    // scroll body container + maska (maskas grafika NAV redzama)
    this._bodyY = this._tableTopY + 18;
    this._bodyMaskY = this._bodyY + 10;

    this._rowsContainer = this.add.container(0, 0);

    this._maskGfx = this.make.graphics({ x: 0, y: 0, add: false });
    this._maskGfx.fillStyle(0xffffff, 1);
    this._maskGfx.fillRect(this._tableX, this._bodyMaskY, this._tableW, this._tableH);
    const mask = this._maskGfx.createGeometryMask();
    this._rowsContainer.setMask(mask);
    // lai NEKAD nerādās baltais fons
    this._maskGfx.setVisible(false);

    this._scroll = 0;
    this._maxScroll = 0;

    // scroll input (desktop + touch)
    this.input.on("wheel", (p, dx, dy) => {
      this._setScroll(this._scroll + dy);
    });

    this.input.on("pointermove", (p) => {
      if (!p.isDown) return;
      // velk uz augšu/leju
      if (p.prevPosition) {
        const delta = p.position.y - p.prevPosition.y;
        this._setScroll(this._scroll - delta);
      }
    });

    // pogas apakšā
    this._btnRestart = this._button(W * 0.30, H - 72, 200, 54, "RESTART", 0x245b33, () => {
      // RESTART -> MainMenu (un MainMenu resetos flagus savā init/create)
      this._cleanupDom();
      this.scene.start("MainMenu");
    });

    this._btnExit = this._button(W * 0.70, H - 72, 200, 54, "IZIET", 0x6a2323, () => {
      // “izeja” web vidē: mēģinām aizvērt; ja bloķē, vismaz pāriet uz Intro
      this._cleanupDom();
      try {
        window.close();
      } catch (e) {}
      this.scene.start("Intro");
    });

    // ielādē TOP
    this._loadTop(success);
  }

  // ---------- TOP LOAD / RENDER ----------

  _loadTop(success) {
    const url = `${this.API_URL}?action=top`;
    this._jsonp(url, "cb_top_", (data) => {
      if (!Array.isArray(data)) {
        this._msg.setText("Neizdevās ielādēt TOP (pārbaudi deploy).");
        return;
      }
      this._top = data;

      // aprēķinām vai spēlētājs iekļūst topā (ja success)
      this._myRank = null;
      if (success) {
        const myTime = Number(this.result.timeSeconds || this.result.timeSec);
        if (Number.isFinite(myTime) && myTime > 0) {
          // rank pēc laika: ja myTime <= pēdējā top laika vai top mazāk par 50
          // (precīzi pēc backend sortēšanas: mazāks laiks labāks)
          if (data.length < 50) {
            this._myRank = data.length + 1; // kandidāts
          } else {
            const last = data[data.length - 1];
            if (myTime <= Number(last.time)) this._myRank = 50; // kandidāts (aptuveni)
          }
        }
      }

      this._renderRows();

      // Ja success un potenciāli topā -> ļaujam ievadi
      if (success && this._isEligibleForSave()) {
        this._msg.setText(`Tava vieta TOP 50: #${this._estimateRank()} — ievadi vārdu un saglabā`);
        this._showSaveUI();
      } else if (success) {
        this._msg.setText("Tu netiki līdz TOP 50.");
      } else {
        this._msg.setText("");
      }
    }, () => {
      this._msg.setText("Neizdevās ielādēt TOP (pārbaudi deploy).");
    });
  }

  _renderRows() {
    // notīram vecās rindas
    this._rowsContainer.removeAll(true);

    const rows = Array.isArray(this._top) ? this._top : [];
    const startY = this._bodyMaskY + 6;

    rows.forEach((r, i) => {
      const y = startY + i * this._rowH;

      const rank = r.rank || (i + 1);
      const name = (r.name ?? "").toString();
      const t = this._formatTime(r.time);

      // viegla līnija (bez blokiem)
      const line = this.add.rectangle(
        this._tableX + this._tableW / 2,
        y + this._rowH / 2 - 2,
        this._tableW,
        1,
        0xffffff,
        0.08
      );
      this._rowsContainer.add(line);

      const tr = this.add
        .text(this._colRankX, y, String(rank), {
          fontFamily: "Arial",
          fontSize: "15px",
          color: "#FFFFFF",
        })
        .setOrigin(0, 0);

      const tn = this.add
        .text(this._colNameX, y, name, {
          fontFamily: "Arial",
          fontSize: "15px",
          color: "#FFFFFF",
        })
        .setOrigin(0, 0);

      const tt = this.add
        .text(this._colTimeX, y, t, {
          fontFamily: "Arial",
          fontSize: "15px",
          color: "#FFFFFF",
        })
        .setOrigin(1, 0);

      this._rowsContainer.add([tr, tn, tt]);
    });

    const contentH = rows.length * this._rowH + 10;
    this._maxScroll = Math.max(0, contentH - this._tableH);
    this._setScroll(0);
  }

  _setScroll(v) {
    this._scroll = Phaser.Math.Clamp(v, 0, this._maxScroll);
    this._rowsContainer.y = -this._scroll;
  }

  // ---------- SAVE UI (fixed, not scrolling) ----------

  _showSaveUI() {
    const W = this.scale.width;

    // DOM input enkurots uz canvas bounds
    this._cleanupDom();

    const rankText = String(this._estimateRank());
    // mazs rank “chip”
    this._rankChip = this.add
      .text(this._tableX + 4, this._saveRowY, rankText, {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#FFFFFF",
        backgroundColor: "rgba(255,255,255,0.10)",
        padding: { left: 8, right: 8, top: 6, bottom: 6 },
      })
      .setOrigin(0, 0.5);

    // Phaser poga “Saglabāt” (vienota ar stilu)
    const btnW = 150;
    const btnH = 40;

    // input platums: garāks un vairāk pa kreisi
    const inputX = this._tableX + 60;
    const inputW = this._tableW - 60 - btnW - 10;

    this._saveBtn = this._button(
      this._tableX + this._tableW - btnW / 2,
      this._saveRowY,
      btnW,
      btnH,
      "Saglabāt",
      0x23465f,
      () => this._submitScore()
    );
    this._saveBtn.container.setDepth(5000);

    // izveidojam DOM input
    const dom = document.createElement("input");
    dom.type = "text";
    dom.maxLength = 28;
    dom.placeholder = "Vārds";
    dom.autocomplete = "off";
    dom.autocapitalize = "words";
    dom.spellcheck = false;

    dom.style.position = "fixed";
    dom.style.height = "38px";
    dom.style.padding = "0 12px";
    dom.style.borderRadius = "10px";
    dom.style.border = "1px solid rgba(255,255,255,0.25)";
    dom.style.background = "rgba(0,0,0,0.35)";
    dom.style.color = "white";
    dom.style.fontSize = "18px";
    dom.style.outline = "none";
    dom.style.pointerEvents = "auto";
    dom.style.zIndex = "999999";

    document.body.appendChild(dom);
    this._nameInput = dom;

    // pozicionēšana pret canvas bounding box
    const layout = () => {
      if (!this._nameInput) return;
      const canvas = this.game.canvas;
      const r = canvas.getBoundingClientRect();

      const px = r.left + (inputX / this.scale.width) * r.width;
      const py = r.top + (this._saveRowY / this.scale.height) * r.height;
      const pw = (inputW / this.scale.width) * r.width;

      this._nameInput.style.left = `${Math.round(px)}px`;
      this._nameInput.style.top = `${Math.round(py - 19)}px`;
      this._nameInput.style.width = `${Math.round(pw)}px`;
    };

    this._layoutDom = layout;
    layout();

    // uz resize/orientation — pārliekam vietā, bet NEkādas scene pārejas
    this.scale.on("resize", layout);

    // Enter -> save
    this._onKeyDown = (ev) => {
      if (!this._nameInput || this._saved) return;
      if (ev.key === "Enter") {
        ev.preventDefault();
        this._submitScore();
      }
    };
    window.addEventListener("keydown", this._onKeyDown);

    // uzreiz fokusē (mobilajā atvērs klaviatūru tikai pēc user action; tas ir normāli)
    setTimeout(() => {
      try { this._nameInput && this._nameInput.focus(); } catch (e) {}
    }, 50);
  }

  _submitScore() {
    if (this._saved) return;
    if (!this._nameInput) return;

    const name = (this._nameInput.value || "").trim().replace(/\s+/g, " ").slice(0, 28);
    if (!name) {
      this._msg.setText("Ievadi vārdu.");
      return;
    }

    const timeSec = Number(this.result.timeSeconds || this.result.timeSec);
    if (!Number.isFinite(timeSec) || timeSec <= 0) {
      this._msg.setText("Slikts laiks.");
      return;
    }

    // bloķējam UI uzreiz (lai nevar spiest 2x)
    this._saved = true;
    this._saveBtn.setEnabled(false);
    this._saveBtn.setLabel("Saglabā...");

    const url =
      `${this.API_URL}?action=submit` +
      `&token=${encodeURIComponent(this.TOKEN)}` +
      `&name=${encodeURIComponent(name)}` +
      `&time=${encodeURIComponent(timeSec)}`;

    this._jsonp(url, "cb_submit_", (res) => {
      if (!res || res.ok !== true) {
        this._saved = false;
        this._saveBtn.setEnabled(true);
        this._saveBtn.setLabel("Saglabāt");
        this._msg.setText((res && res.error) ? res.error : "Neizdevās saglabāt.");
        return;
      }

      // veiksmīgi: izņemam input un aizslēdzam pogu
      this._saveBtn.setLabel("Saglabāts ✓");
      this._saveBtn.setEnabled(false);
      this._msg.setText("Saglabāts.");

      this._cleanupDom(); // <- vairs nav aktīva ievade

      // pārlādējam TOP, lai sevi redzi
      this._jsonp(`${this.API_URL}?action=top`, "cb_top2_", (data) => {
        if (Array.isArray(data)) {
          this._top = data;
          this._renderRows();
        }
      }, () => {});
    }, () => {
      this._saved = false;
      this._saveBtn.setEnabled(true);
      this._saveBtn.setLabel("Saglabāt");
      this._msg.setText("Neizdevās saglabāt.");
    });
  }

  _cleanupDom() {
    // noņem resize listeneri
    if (this._layoutDom) {
      try { this.scale.off("resize", this._layoutDom); } catch (e) {}
      this._layoutDom = null;
    }
    // noņem keydown
    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }
    // noņem input elementu
    if (this._nameInput) {
      try { this._nameInput.blur(); } catch (e) {}
      try { this._nameInput.disabled = true; } catch (e) {}
      try { this._nameInput.remove(); } catch (e) {}
      this._nameInput = null;
    }
    // noņem rank chip (ja vajag)
    if (this._rankChip) {
      this._rankChip.destroy();
      this._rankChip = null;
    }
  }

  shutdown() {
    this._cleanupDom();
  }

  // ---------- helpers ----------

  _isEligibleForSave() {
    // TOP50 gadījumā: ja top nav ielādēts, nevar
    if (!Array.isArray(this._top)) return false;

    const myTime = Number(this.result.timeSeconds || this.result.timeSec);
    if (!Number.isFinite(myTime) || myTime <= 0) return false;

    // ja top < 50 -> kvalificējas automātiski
    if (this._top.length < 50) return true;

    const last = this._top[this._top.length - 1];
    return myTime <= Number(last.time);
  }

  _estimateRank() {
    // aptuveni pareizi: atrod pirmo vietu, kur myTime būtu ieliekams
    const myTime = Number(this.result.timeSeconds || this.result.timeSec);
    if (!Array.isArray(this._top) || !Number.isFinite(myTime)) return 50;

    for (let i = 0; i < this._top.length; i++) {
      if (myTime <= Number(this._top[i].time)) return i + 1;
    }
    return Math.min(50, this._top.length + 1);
  }

  _formatTime(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  _jsonp(url, cbPrefix, onOk, onFail) {
    const cbName = `${cbPrefix}${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const script = document.createElement("script");
    const sep = url.includes("?") ? "&" : "?";
    script.src = `${url}${sep}callback=${cbName}`;
    script.async = true;

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
      try { script.remove(); } catch (e) {}
    };

    const timer = setTimeout(() => {
      cleanup();
      onFail && onFail();
    }, 9000);

    window[cbName] = (data) => {
      clearTimeout(timer);
      cleanup();
      onOk && onOk(data);
    };

    script.onerror = () => {
      clearTimeout(timer);
      cleanup();
      onFail && onFail();
    };

    document.body.appendChild(script);
  }

  _button(x, y, w, h, label, color, onClick) {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, color, 1).setOrigin(0.5);
    const txt = this.add
      .text(0, 0, label, {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#FFFFFF",
      })
      .setOrigin(0.5);

    container.add([bg, txt]);
    container.setSize(w, h);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains
    );

    const api = {
      container,
      setEnabled: (v) => {
        container.disableInteractive();
        if (v) {
          container.setInteractive(
            new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
            Phaser.Geom.Rectangle.Contains
          );
          bg.setAlpha(1);
          txt.setAlpha(1);
        } else {
          bg.setAlpha(0.6);
          txt.setAlpha(0.6);
        }
      },
      setLabel: (t) => txt.setText(t),
    };

    container.on("pointerdown", () => {
      if (onClick) onClick();
    });

    return api;
  }
}

window.Finish = Finish;
