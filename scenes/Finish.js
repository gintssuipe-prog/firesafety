// Finish.js — spēles finiša scēna (Intro stilā)
class Finish extends Phaser.Scene {
  constructor() {
    super("Finish");

    this._onResize = null;
    this._bg = null;
    this._overlay = null;

    this._title = null;
    this._body = null;

    this._btnPlayBg = null;
    this._btnPlayText = null;

    this._btnExitBg = null;
    this._btnExitText = null;

    this._nameLabel = null;
    this._nameInput = null;

    this._resultText = null;
  }

  preload() {
    // droši — ja kāds ienāk Finish, neizejot caur Intro
    if (!this.textures.exists("intro_bg")) {
      this.load.image("intro_bg", "assets/img/intro.png");
    }
  }

  create(data) {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor("#101a24");

    // fons (Intro stils)
    this._bg = this.add.image(W / 2, H / 2, "intro_bg").setOrigin(0.5);

    // tumšs overlay, lai teksts ir lasāms
    this._overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55);

    // datu interpretācija
    const reason = data && data.reason ? data.reason : "exit";
    const elapsedMs = data && typeof data.elapsedMs === "number" ? data.elapsedMs : 0;

    const totalSec = Math.floor(elapsedMs / 1000);
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;

    let title = "Misija nav izpildīta!";
    let body = "";

    if (reason === "success") {
      title = "Misija ir izpildīta!";
      body = `Tavs laiks ir ${mm} minūtes ${ss} sekundes`;
    } else if (reason === "timeout") {
      body = "Jūs neiekļāvāties 15 minūtēs un nepaspējāt nomainīt visus 10 ugunsdzēšamos aparātus.";
    } else {
      // exit
      body = "Jūs izgājāt no misijas ar EXIT.";
    }

    this._title = this.add
      .text(W / 2, 0, title, {
        fontFamily: "Arial",
        fontSize: "34px",
        color: "#ffffff",
        fontStyle: "bold",
        align: "center"
      })
      .setOrigin(0.5, 0);

    this._body = this.add
      .text(W / 2, 0, body, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#e7edf5",
        align: "center",
        wordWrap: { width: Math.round(W * 0.86) }
      })
      .setOrigin(0.5, 0);

    // Vārda ievade tikai uzvaras gadījumā (pagaidām lokāli — UI sagatavots)
    if (reason === "success") {
      this._nameLabel = this.add
        .text(W / 2, 0, "Ieraksti savu vārdu rezultātu tabulai:", {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#ffffff",
          align: "center"
        })
        .setOrigin(0.5, 0);

      // HTML input virs canvasa (vienkārši + stabils)
      const el = document.createElement("input");
      el.type = "text";
      el.placeholder = "Tavs vārds";
      el.maxLength = 24;
      el.style.position = "absolute";
      el.style.left = "0px";
      el.style.top = "0px";
      el.style.width = Math.round(W * 0.70) + "px";
      el.style.height = "36px";
      el.style.fontSize = "16px";
      el.style.borderRadius = "10px";
      el.style.border = "1px solid rgba(255,255,255,0.25)";
      el.style.padding = "0 12px";
      el.style.background = "rgba(10,16,24,0.85)";
      el.style.color = "#ffffff";
      el.style.outline = "none";

      this._nameInput = this.add.dom(0, 0, el);

      // (Pagaidām) parādām lokālo “preview” rindu zemāk
      this._resultText = this.add
        .text(W / 2, 0, "", {
          fontFamily: "Arial",
          fontSize: "14px",
          color: "#cfe6ff",
          align: "center"
        })
        .setOrigin(0.5, 0);

      const updatePreview = () => {
        const name = (el.value || "").trim() || "Anonīms";
        this._resultText.setText(`Rezultāts: ${name} — ${mm}m ${ss}s`);
      };
      el.addEventListener("input", updatePreview);
      updatePreview();
    }

    // Pogas
    const mkBtn = (label) => {
      const bg = this.add
        .rectangle(0, 0, Math.round(W * 0.62), 52, 0x132235, 0.95)
        .setStrokeStyle(2, 0xffffff, 0.22)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      const t = this.add
        .text(0, 0, label, {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#ffffff",
          fontStyle: "bold"
        })
        .setOrigin(0.5);

      return { bg, t };
    };

    const play = mkBtn("SPĒLĒT");
    this._btnPlayBg = play.bg;
    this._btnPlayText = play.t;

    const exit = mkBtn("IZIET");
    this._btnExitBg = exit.bg;
    this._btnExitText = exit.t;
    this._btnExitBg.setFillStyle(0x3a0f0f, 0.95);

    const pressIn = (bg, t) => {
      this.tweens.add({ targets: [bg, t], scaleX: 0.96, scaleY: 0.96, duration: 60 });
    };
    const pressOut = (bg, t) => {
      this.tweens.add({ targets: [bg, t], scaleX: 1.0, scaleY: 1.0, duration: 80 });
    };

    // SPĒLĒT → jauna spēle
    this._btnPlayBg.on("pointerdown", () => pressIn(this._btnPlayBg, this._btnPlayText));
    this._btnPlayBg.on("pointerup", () => {
      pressOut(this._btnPlayBg, this._btnPlayText);
      this.scene.start("Stage1");
    });
    this._btnPlayBg.on("pointerout", () => pressOut(this._btnPlayBg, this._btnPlayText));
    this._btnPlayBg.on("pointercancel", () => pressOut(this._btnPlayBg, this._btnPlayText));

    // IZIET → pilnībā ārā
    const doExit = () => {
      try {
        window.open("", "_self");
        window.close();
      } catch (e) {}

      try {
        this.game.destroy(true);
      } catch (e) {}

      try {
        window.location.href = "about:blank";
      } catch (e) {}
    };

    this._btnExitBg.on("pointerdown", () => pressIn(this._btnExitBg, this._btnExitText));
    this._btnExitBg.on("pointerup", () => {
      pressOut(this._btnExitBg, this._btnExitText);
      doExit();
    });
    this._btnExitBg.on("pointerout", () => pressOut(this._btnExitBg, this._btnExitText));
    this._btnExitBg.on("pointercancel", () => pressOut(this._btnExitBg, this._btnExitText));

    // layout + resize
    const layout = (w, h) => {
      // bg “cover”
      const scale = Math.max(w / this._bg.width, h / this._bg.height);
      this._bg.setScale(scale).setPosition(w / 2, h / 2);

      this._overlay.setPosition(w / 2, h / 2).setSize(w, h);

      let y = Math.round(h * 0.14);
      this._title.setPosition(w / 2, y);
      y += this._title.height + 18;

      this._body.setWordWrapWidth(Math.round(w * 0.86), true);
      this._body.setPosition(w / 2, y);
      y += this._body.height + 24;

      if (this._nameLabel && this._nameInput) {
        this._nameLabel.setPosition(w / 2, y);
        y += this._nameLabel.height + 10;

        this._nameInput.setPosition(w / 2, y + 18);
        // HTML element size (ja resize)
        const el = this._nameInput.node;
        el.style.width = Math.round(w * 0.70) + "px";

        y += 56;

        if (this._resultText) {
          this._resultText.setPosition(w / 2, y);
          y += this._resultText.height + 22;
        }
      }

      const btnGap = 16;
      const btnW = Math.round(w * 0.62);
      this._btnPlayBg.width = btnW;
      this._btnExitBg.width = btnW;

      const btnY = Math.min(h - 170, y + 20);
      this._btnPlayBg.setPosition(w / 2, btnY);
      this._btnPlayText.setPosition(w / 2, btnY);

      this._btnExitBg.setPosition(w / 2, btnY + 52 + btnGap);
      this._btnExitText.setPosition(w / 2, btnY + 52 + btnGap);
    };

    layout(W, H);

    this._onResize = (gameSize) => layout(gameSize.width, gameSize.height);
    this.scale.on("resize", this._onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      try {
        if (this._onResize) this.scale.off("resize", this._onResize);
      } catch (e) {}

      // DOM input cleanup (lai nepaliek “karājoties”)
      try {
        if (this._nameInput) this._nameInput.destroy();
      } catch (e) {}
    });
  }
}

window.Finish = Finish;
