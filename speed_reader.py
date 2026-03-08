#!/usr/bin/env python3
"""
RSVP Speed Reader with ORP (Optimal Recognition Point)
Displays one word at a time with a red anchor letter for eye focus.
Perfect for ADHD - eliminates page jumping.
"""

import tkinter as tk
from tkinter import filedialog, ttk
import re
import os
import sys
import ctypes


# -- Color Palette --
BG_DARK = "#0d0d0d"
BG_PANEL = "#1a1a2e"
BG_CARD = "#16213e"
BG_BUTTON = "#1e2a4a"
BG_BUTTON_HOVER = "#2d3f6b"
BG_BUTTON_ACTIVE = "#3a5199"
FG_PRIMARY = "#e2e8f0"
FG_SECONDARY = "#94a3b8"
FG_DIM = "#64748b"
FG_ACCENT = "#818cf8"
ORP_COLOR = "#f43f5e"
PROGRESS_COLOR = "#6366f1"
BORDER_COLOR = "#1e293b"
FOCUS_LINE_COLOR = "#334155"

SPEED_TIERS = [
    (200, "Chill Mode"),
    (350, "Steady Reader"),
    (500, "Speed Demon"),
    (650, "Turbo Mode"),
    (800, "Ludicrous Speed"),
]

SAMPLE_TEXTS = {
    "RSVP Guide": (
        "Speed reading with RSVP works by displaying one word at a time in the same position. "
        "This eliminates the need for your eyes to scan across the page, which accounts for roughly "
        "eighty percent of traditional reading time. The red letter you see is called the Optimal "
        "Recognition Point, or ORP. It sits slightly left of center in each word, where your eye "
        "naturally focuses. Your brain can lock onto it instantly, processing the word without "
        "conscious effort. Start slow at around two hundred words per minute. As your brain adapts, "
        "gradually push the speed up. Most people reach five hundred words per minute with practice. "
        "The key is consistency. Short daily sessions beat long marathon reads every time. Take "
        "breaks often. Speed reading is mentally intensive work, and your brain needs recovery time "
        "to consolidate what you have just absorbed. Happy reading."
    ),
    "Science of Sleep": (
        "Sleep is not passive downtime. While you rest, your brain runs an intensive maintenance "
        "cycle that no waking state can replicate. During deep slow-wave sleep, the glymphatic "
        "system flushes toxic waste proteins from neural tissue, including amyloid beta, the same "
        "compound that accumulates in Alzheimer's disease. Memory consolidation happens in parallel. "
        "The hippocampus replays the day's experiences, transferring key patterns into long-term "
        "cortical storage. REM sleep then stress-tests those memories by recombining them in novel "
        "ways, which is why creative breakthroughs often arrive the morning after a good night's "
        "sleep. Adults need between seven and nine hours. Cutting sleep to six hours for two weeks "
        "produces cognitive deficits equivalent to two full nights of total deprivation, yet most "
        "people feel only mildly tired. The lesson is simple: protect your sleep like the "
        "biological necessity it actually is."
    ),
    "History of the Internet": (
        "The internet began as ARPANET, a United States Defense Department project launched in "
        "nineteen sixty-nine with four connected nodes at universities across California and Utah. "
        "The first message ever sent crashed the receiving computer after just two letters. By the "
        "nineteen eighties, email had become the killer application, and the network expanded beyond "
        "military and academic circles. Tim Berners-Lee invented the World Wide Web in nineteen "
        "eighty-nine while working at CERN in Switzerland, proposing a system of hyperlinked "
        "documents to help physicists share research. The first website went live in nineteen "
        "ninety-one. Mosaic, the first graphical browser, arrived in nineteen ninety-three and "
        "opened the web to ordinary users. Within a decade, e-commerce, search engines, and social "
        "networks had reshaped global commerce and communication. Today over five billion people "
        "are connected, and the infrastructure that started with four nodes now carries more than "
        "four exabytes of data every single day."
    ),
    "Stoic Philosophy": (
        "Stoicism was founded in Athens around three hundred BCE by Zeno of Citium, who taught "
        "philosophy in a painted porch called the Stoa Poikile, giving the school its name. The "
        "Stoics believed that virtue alone constitutes the good life, and that external circumstances "
        "such as wealth, reputation, and health are ultimately indifferent. What matters is how you "
        "respond to them. Marcus Aurelius, a Roman emperor and Stoic practitioner, wrote his "
        "Meditations as a private journal of self-correction, never intending it to be read by "
        "others. He reminded himself daily that he controlled only his judgments, intentions, and "
        "responses, never outcomes. Epictetus, a former slave, taught the same principle: divide "
        "every situation into what lies within your power and what does not, then pour all your "
        "energy into the former and release the latter entirely. Two thousand years later, this "
        "framework underpins cognitive behavioral therapy, modern resilience training, and the "
        "thinking of some of the world's most effective leaders."
    ),
}


def get_speed_tier(wpm):
    for threshold, label in SPEED_TIERS:
        if wpm <= threshold:
            return label
    return "Ludicrous Speed"


class RoundedButton(tk.Canvas):
    """A modern rounded button using Canvas."""

    def __init__(self, parent, text="", command=None, width=140, height=42,
                 bg=BG_BUTTON, fg=FG_PRIMARY, hover_bg=BG_BUTTON_HOVER,
                 active_bg=BG_BUTTON_ACTIVE, font=("Segoe UI", 11), **kwargs):
        super().__init__(parent, width=width, height=height,
                         bg=parent["bg"], highlightthickness=0, **kwargs)
        self.command = command
        self.bg = bg
        self.fg = fg
        self.hover_bg = hover_bg
        self.active_bg = active_bg
        self._text = text
        self._font = font
        self._width = width
        self._height = height
        self._draw(bg)

        self.bind("<Enter>", lambda e: self._draw(self.hover_bg))
        self.bind("<Leave>", lambda e: self._draw(self.bg))
        self.bind("<ButtonPress-1>", self._on_press)
        self.bind("<ButtonRelease-1>", self._on_release)

    def _draw(self, fill):
        self.delete("all")
        r = 10
        w, h = self._width, self._height
        # Rounded rectangle
        self.create_arc(0, 0, r * 2, r * 2, start=90, extent=90, fill=fill, outline="")
        self.create_arc(w - r * 2, 0, w, r * 2, start=0, extent=90, fill=fill, outline="")
        self.create_arc(0, h - r * 2, r * 2, h, start=180, extent=90, fill=fill, outline="")
        self.create_arc(w - r * 2, h - r * 2, w, h, start=270, extent=90, fill=fill, outline="")
        self.create_rectangle(r, 0, w - r, h, fill=fill, outline="")
        self.create_rectangle(0, r, w, h - r, fill=fill, outline="")
        # Text
        self.create_text(w // 2, h // 2, text=self._text, fill=self.fg, font=self._font)

    def _on_press(self, event):
        self._draw(self.active_bg)

    def _on_release(self, event):
        self._draw(self.hover_bg)
        if self.command:
            self.command()

    def set_text(self, text):
        self._text = text
        self._draw(self.bg)


class SpeedReader:
    def __init__(self, root):
        self.root = root
        self.root.title("RSVP Speed Reader")
        self.root.configure(bg=BG_DARK)
        self.root.geometry("960x680")
        self.root.minsize(800, 580)

        # State
        self.words = []
        self.current_index = 0
        self.is_playing = False
        self.wpm = 300
        self.after_id = None

        self._configure_styles()
        self.setup_ui()
        self.bind_keys()
        self.root.after(50, self._apply_dark_titlebar)

    def _configure_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        # Progress bar
        style.configure(
            "Custom.Horizontal.TProgressbar",
            troughcolor=BG_PANEL,
            background=PROGRESS_COLOR,
            darkcolor=PROGRESS_COLOR,
            lightcolor=PROGRESS_COLOR,
            bordercolor=BG_DARK,
            thickness=6,
        )

        # Scale / slider
        style.configure(
            "Custom.Horizontal.TScale",
            troughcolor=BG_PANEL,
            background=PROGRESS_COLOR,
            darkcolor=BG_DARK,
            lightcolor=BG_DARK,
            bordercolor=BG_DARK,
            sliderthickness=18,
            sliderrelief="flat",
        )
        style.map("Custom.Horizontal.TScale",
                   background=[("active", FG_ACCENT)])

    def setup_ui(self):
        # ---- Footer (pack first so it stays at bottom) ----
        footer = tk.Frame(self.root, bg=BG_PANEL, pady=8)
        footer.pack(fill="x", side="bottom")

        shortcuts = [
            ("Space", "Play/Pause"),
            ("\u2190/\u2192", "Skip words"),
            ("\u2191/\u2193", "Speed"),
            ("Esc", "Restart"),
        ]
        shortcut_frame = tk.Frame(footer, bg=BG_PANEL)
        shortcut_frame.pack()

        for i, (key, action) in enumerate(shortcuts):
            if i > 0:
                tk.Label(
                    shortcut_frame, text="\u2022",
                    font=("Segoe UI", 9), fg=FG_DIM, bg=BG_PANEL
                ).pack(side="left", padx=6)

            tk.Label(
                shortcut_frame, text=key,
                font=("Consolas", 9, "bold"), fg=FG_ACCENT, bg=BG_PANEL
            ).pack(side="left")
            tk.Label(
                shortcut_frame, text=f" {action}",
                font=("Segoe UI", 9), fg=FG_DIM, bg=BG_PANEL
            ).pack(side="left")

        # ---- Header ----
        header = tk.Frame(self.root, bg=BG_PANEL, pady=12)
        header.pack(fill="x")

        title_frame = tk.Frame(header, bg=BG_PANEL)
        title_frame.pack()

        tk.Label(
            title_frame, text="RSVP Speed Reader",
            font=("Segoe UI", 20, "bold"), fg=FG_PRIMARY, bg=BG_PANEL
        ).pack(side="left")

        tk.Label(
            title_frame, text="   ORP",
            font=("Segoe UI", 20, "bold"), fg=ORP_COLOR, bg=BG_PANEL
        ).pack(side="left")

        tk.Label(
            header, text="Focus on the red letter. Let the words come to you.",
            font=("Segoe UI", 10), fg=FG_SECONDARY, bg=BG_PANEL
        ).pack(pady=(2, 0))

        # ---- Thin accent line ----
        tk.Frame(self.root, bg=PROGRESS_COLOR, height=2).pack(fill="x")

        # ---- Main content area ----
        self.main_frame = tk.Frame(self.root, bg=BG_DARK)
        self.main_frame.pack(expand=True, fill="both")

        # ---- Word display card ----
        card_wrapper = tk.Frame(self.main_frame, bg=BG_DARK)
        card_wrapper.pack(expand=True, fill="both", padx=40, pady=(20, 5))

        self.display_card = tk.Frame(
            card_wrapper, bg=BG_CARD,
            highlightbackground=BORDER_COLOR, highlightthickness=1,
        )
        self.display_card.pack(expand=True, fill="both")

        # Word container inside card — centered
        self.word_container = tk.Frame(self.display_card, bg=BG_CARD)
        self.word_container.place(relx=0.5, rely=0.4, anchor="center")

        self.label_before = tk.Label(
            self.word_container, text="",
            font=("Consolas", 64, "bold"), fg=FG_PRIMARY, bg=BG_CARD,
            anchor="e"
        )
        self.label_before.pack(side="left")

        self.label_orp = tk.Label(
            self.word_container, text="",
            font=("Consolas", 64, "bold"), fg=ORP_COLOR, bg=BG_CARD
        )
        self.label_orp.pack(side="left")

        self.label_after = tk.Label(
            self.word_container, text="",
            font=("Consolas", 64, "bold"), fg=FG_PRIMARY, bg=BG_CARD,
            anchor="w"
        )
        self.label_after.pack(side="left")

        # Focus line under word
        self.focus_line = tk.Frame(self.display_card, bg=FOCUS_LINE_COLOR, height=2)
        self.focus_line.place(relx=0.5, rely=0.7, anchor="center", relwidth=0.7)

        # Prompt text (shown when no file loaded)
        self.prompt_label = tk.Label(
            self.display_card,
            text="Pick a sample below, or upload your own file",
            font=("Segoe UI", 14), fg=FG_DIM, bg=BG_CARD
        )
        self.prompt_label.place(relx=0.5, rely=0.4, anchor="center")

        # ---- Bottom controls area (fixed-height, packed below card) ----
        bottom_area = tk.Frame(self.main_frame, bg=BG_DARK)
        bottom_area.pack(fill="x", padx=40, pady=(5, 10))

        # ---- Progress bar ----
        self.progress_var = tk.DoubleVar()
        self.progress = ttk.Progressbar(
            bottom_area, variable=self.progress_var, maximum=100,
            style="Custom.Horizontal.TProgressbar"
        )
        self.progress.pack(fill="x", ipady=1, pady=(0, 12))

        # ---- Controls row ----
        controls = tk.Frame(bottom_area, bg=BG_DARK)
        controls.pack(pady=(0, 10))

        self.upload_btn = RoundedButton(
            controls, text="Upload File", command=self.upload_file,
            width=140, height=42
        )
        self.upload_btn.pack(side="left", padx=8)

        self.play_btn = RoundedButton(
            controls, text="Play", command=self.toggle_play,
            width=120, height=42, bg="#4f46e5", hover_bg="#6366f1",
            active_bg="#818cf8"
        )
        self.play_btn.pack(side="left", padx=8)

        self.restart_btn = RoundedButton(
            controls, text="Restart", command=self.restart,
            width=120, height=42
        )
        self.restart_btn.pack(side="left", padx=8)

        # ---- Sample texts row ----
        samples_row = tk.Frame(bottom_area, bg=BG_DARK)
        samples_row.pack(pady=(4, 0))

        tk.Label(
            samples_row, text="Samples:",
            font=("Segoe UI", 9), fg=FG_DIM, bg=BG_DARK
        ).pack(side="left", padx=(0, 8))

        for name in SAMPLE_TEXTS:
            RoundedButton(
                samples_row, text=name,
                command=lambda n=name: self.load_sample(n),
                width=180, height=34,
                bg=BG_BUTTON, hover_bg=BG_BUTTON_HOVER, active_bg=BG_BUTTON_ACTIVE,
                font=("Segoe UI", 9),
            ).pack(side="left", padx=4)

        # ---- Speed section ----
        speed_section = tk.Frame(bottom_area, bg=BG_DARK)
        speed_section.pack(pady=(0, 6))

        self.speed_label = tk.Label(
            speed_section, text="300 WPM",
            font=("Segoe UI", 14, "bold"), fg=FG_PRIMARY, bg=BG_DARK
        )
        self.speed_label.pack()

        self.tier_label = tk.Label(
            speed_section, text="Steady Reader",
            font=("Segoe UI", 10), fg=FG_ACCENT, bg=BG_DARK
        )
        self.tier_label.pack()

        slider_frame = tk.Frame(speed_section, bg=BG_DARK)
        slider_frame.pack(pady=(4, 0))

        tk.Label(
            slider_frame, text="100", font=("Segoe UI", 9),
            fg=FG_DIM, bg=BG_DARK
        ).pack(side="left", padx=(0, 6))

        self.speed_var = tk.IntVar(value=300)
        self.speed_slider = ttk.Scale(
            slider_frame, from_=100, to=800,
            orient="horizontal", variable=self.speed_var,
            command=self.update_speed, style="Custom.Horizontal.TScale",
            length=350
        )
        self.speed_slider.pack(side="left")

        tk.Label(
            slider_frame, text="800", font=("Segoe UI", 9),
            fg=FG_DIM, bg=BG_DARK
        ).pack(side="left", padx=(6, 0))

        # ---- Info label ----
        self.info_label = tk.Label(
            bottom_area,
            text="",
            font=("Segoe UI", 10), fg=FG_SECONDARY, bg=BG_DARK
        )
        self.info_label.pack(pady=(4, 0))

    def _apply_dark_titlebar(self):
        """Apply dark title bar on Windows 10/11 via DWMAPI."""
        if sys.platform != "win32":
            return
        try:
            DWMWA_USE_IMMERSIVE_DARK_MODE = 20
            hwnd = self.root.winfo_id()
            ctypes.windll.dwmapi.DwmSetWindowAttribute(
                hwnd,
                DWMWA_USE_IMMERSIVE_DARK_MODE,
                ctypes.byref(ctypes.c_int(1)),
                ctypes.sizeof(ctypes.c_int),
            )
        except Exception:
            pass

    def bind_keys(self):
        self.root.bind('<space>', lambda e: self.toggle_play())
        self.root.bind('<Left>', lambda e: self.skip_backward())
        self.root.bind('<Right>', lambda e: self.skip_forward())
        self.root.bind('<Up>', lambda e: self.increase_speed())
        self.root.bind('<Down>', lambda e: self.decrease_speed())
        self.root.bind('<Escape>', lambda e: self.stop())

    def calculate_orp(self, word):
        """
        Calculate the Optimal Recognition Point (ORP) index.
        The ORP is slightly left of center - where the eye naturally focuses.
        """
        length = len(word)
        if length <= 1:
            return 0
        elif length <= 5:
            return 1
        elif length <= 9:
            return 2
        elif length <= 13:
            return 3
        else:
            return 4

    def display_word(self, word):
        """Display a word with the ORP letter highlighted in red."""
        # Hide prompt when displaying words
        self.prompt_label.place_forget()

        if not word:
            self.label_before.config(text="")
            self.label_orp.config(text="")
            self.label_after.config(text="")
            return

        # Clean the word for ORP calculation but display original
        clean_word = re.sub(r'[^\w]', '', word)
        orp_index = self.calculate_orp(clean_word)

        # Find the ORP position in the original word (accounting for punctuation)
        actual_orp = 0
        letter_count = 0
        for i, char in enumerate(word):
            if char.isalnum():
                if letter_count == orp_index:
                    actual_orp = i
                    break
                letter_count += 1

        # Split word into three parts
        before = word[:actual_orp]
        orp_letter = word[actual_orp] if actual_orp < len(word) else ""
        after = word[actual_orp + 1:] if actual_orp + 1 < len(word) else ""

        self.label_before.config(text=before)
        self.label_orp.config(text=orp_letter)
        self.label_after.config(text=after)

    def upload_file(self):
        """Open file dialog and load document."""
        filetypes = [
            ("Text files", "*.txt"),
            ("All files", "*.*")
        ]

        filepath = filedialog.askopenfilename(filetypes=filetypes)

        if filepath:
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    text = f.read()

                # Split into words, preserving punctuation attached to words
                self.words = text.split()
                self.current_index = 0
                self.update_display()

                filename = os.path.basename(filepath)
                est_minutes = len(self.words) // self.wpm
                self.info_label.config(
                    text=f"{filename}  \u2022  {len(self.words)} words  \u2022  ~{est_minutes} min"
                )

            except Exception as e:
                self.info_label.config(text=f"Error: {str(e)}")

    def load_sample(self, name):
        """Load a pre-defined sample text."""
        text = SAMPLE_TEXTS[name]
        self.words = text.split()
        self.current_index = 0
        self.is_playing = False
        self.play_btn.set_text("Play")
        if self.after_id:
            self.root.after_cancel(self.after_id)
        self.update_display()
        est_minutes = max(1, len(self.words) // self.wpm)
        self.info_label.config(
            text=f"{name}  \u2022  {len(self.words)} words  \u2022  ~{est_minutes} min"
        )

    def update_display(self):
        """Update the word display and progress."""
        if self.words:
            word = self.words[self.current_index]
            self.display_word(word)

            # Update progress
            progress = (self.current_index / len(self.words)) * 100
            self.progress_var.set(progress)

            # Update info
            self.info_label.config(
                text=f"Word {self.current_index + 1} of {len(self.words)}  \u2022  {self.wpm} WPM"
            )

    def toggle_play(self):
        """Toggle between play and pause."""
        if self.is_playing:
            self.pause()
        else:
            self.play()

    def play(self):
        """Start playing words."""
        if not self.words:
            return

        self.is_playing = True
        self.play_btn.set_text("Pause")
        self.show_next_word()

    def pause(self):
        """Pause playback."""
        self.is_playing = False
        self.play_btn.set_text("Play")
        if self.after_id:
            self.root.after_cancel(self.after_id)

    def stop(self):
        """Stop and reset."""
        self.pause()
        self.current_index = 0
        self.update_display()

    def show_next_word(self):
        """Display the next word and schedule the following one."""
        if not self.is_playing or not self.words:
            return

        self.update_display()

        # Move to next word
        self.current_index += 1

        # Check if we've reached the end
        if self.current_index >= len(self.words):
            self.current_index = len(self.words) - 1
            self.pause()
            self.info_label.config(text="Finished! Press Restart to read again.")
            return

        # Calculate delay based on WPM
        current_word = self.words[self.current_index - 1]
        base_delay = 60000 / self.wpm

        # Add extra time for punctuation (natural pause points)
        if any(p in current_word for p in '.!?'):
            delay = int(base_delay * 1.5)
        elif any(p in current_word for p in ',;:'):
            delay = int(base_delay * 1.2)
        else:
            delay = int(base_delay)

        self.after_id = self.root.after(delay, self.show_next_word)

    def update_speed(self, value=None):
        """Update WPM from slider."""
        self.wpm = self.speed_var.get()
        tier = get_speed_tier(self.wpm)
        self.speed_label.config(text=f"{self.wpm} WPM")
        self.tier_label.config(text=tier)
        if self.words:
            self.info_label.config(
                text=f"Word {self.current_index + 1} of {len(self.words)}  \u2022  {self.wpm} WPM"
            )

    def increase_speed(self):
        """Increase speed by 50 WPM."""
        new_speed = min(800, self.speed_var.get() + 50)
        self.speed_var.set(new_speed)
        self.update_speed()

    def decrease_speed(self):
        """Decrease speed by 50 WPM."""
        new_speed = max(100, self.speed_var.get() - 50)
        self.speed_var.set(new_speed)
        self.update_speed()

    def skip_forward(self):
        """Skip forward 5 words."""
        if self.words:
            self.current_index = min(len(self.words) - 1, self.current_index + 5)
            self.update_display()

    def skip_backward(self):
        """Skip backward 5 words."""
        if self.words:
            self.current_index = max(0, self.current_index - 5)
            self.update_display()

    def restart(self):
        """Restart from beginning."""
        self.pause()
        self.current_index = 0
        if self.words:
            self.update_display()


def main():
    root = tk.Tk()
    app = SpeedReader(root)
    root.mainloop()


if __name__ == "__main__":
    main()
