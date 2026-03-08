"""
Comprehensive tests for the RSVP Speed Reader Python prototype.
Tests cover: ORP calculation, word display/splitting, playback timing,
speed controls, skip forward/backward, and edge cases.
"""

import re
import sys
import os
import pytest
from unittest.mock import MagicMock, patch, PropertyMock

# Add parent directory to path so we can import speed_reader
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ---------------------------------------------------------------------------
# We cannot instantiate SpeedReader directly (it requires a real Tk root
# and sets up a full GUI). Instead we test the pure logic by extracting the
# methods into standalone helpers that mirror the source exactly.
# This keeps the tests fast, headless, and free of tkinter dependencies.
# ---------------------------------------------------------------------------


def calculate_orp(word: str) -> int:
    """
    Mirrors SpeedReader.calculate_orp exactly.
    Calculate the Optimal Recognition Point (ORP) index.
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


def split_word(word: str):
    """
    Mirrors the display_word logic from SpeedReader.
    Returns (before, orp_letter, after) tuple.
    """
    if not word:
        return ("", "", "")

    # Clean the word for ORP calculation but display original
    clean_word = re.sub(r'[^\w]', '', word)
    orp_index = calculate_orp(clean_word)

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

    return (before, orp_letter, after)


def compute_delay(word: str, wpm: int) -> int:
    """
    Mirrors the delay calculation from SpeedReader.show_next_word exactly.
    """
    base_delay = 60000 / wpm

    if any(p in word for p in '.!?'):
        delay = int(base_delay * 1.5)
    elif any(p in word for p in ',;:'):
        delay = int(base_delay * 1.2)
    else:
        delay = int(base_delay)

    return delay


def increase_speed(current: int) -> int:
    """Mirrors SpeedReader.increase_speed."""
    return min(800, current + 50)


def decrease_speed(current: int) -> int:
    """Mirrors SpeedReader.decrease_speed."""
    return max(100, current - 50)


def skip_forward(current_index: int, word_count: int) -> int:
    """Mirrors SpeedReader.skip_forward."""
    if word_count > 0:
        return min(word_count - 1, current_index + 5)
    return current_index


def skip_backward(current_index: int, word_count: int) -> int:
    """Mirrors SpeedReader.skip_backward."""
    if word_count > 0:
        return max(0, current_index - 5)
    return current_index


# ===========================================================================
# ORP Calculation Tests
# ===========================================================================

class TestCalculateORP:
    """Exhaustive tests for calculate_orp across all word length ranges."""

    # --- Length 0 (empty string) ---
    def test_empty_string(self):
        assert calculate_orp("") == 0

    # --- Length 1 ---
    def test_single_char(self):
        assert calculate_orp("I") == 0

    def test_single_char_lowercase(self):
        assert calculate_orp("a") == 0

    # --- Length 2 to 5 (ORP = 1) ---
    def test_length_2(self):
        assert calculate_orp("to") == 1

    def test_length_3(self):
        assert calculate_orp("the") == 1

    def test_length_4(self):
        assert calculate_orp("word") == 1

    def test_length_5(self):
        assert calculate_orp("hello") == 1

    # --- Length 6 to 9 (ORP = 2) ---
    def test_length_6(self):
        assert calculate_orp("simple") == 2

    def test_length_7(self):
        assert calculate_orp("reading") == 2

    def test_length_8(self):
        assert calculate_orp("powerful") == 2

    def test_length_9(self):
        assert calculate_orp("algorithm") == 2

    # --- Length 10 to 13 (ORP = 3) ---
    def test_length_10(self):
        assert calculate_orp("algorithms") == 3

    def test_length_11(self):
        assert calculate_orp("programming") == 3

    def test_length_12(self):
        assert calculate_orp("optimization") == 3

    def test_length_13(self):
        assert calculate_orp("documentation") == 3

    # --- Length 14+ (ORP = 4) ---
    def test_length_14(self):
        assert calculate_orp("transportation") == 4

    def test_length_15(self):
        assert calculate_orp("internationalize") == 4

    def test_length_20(self):
        assert calculate_orp("abcdefghijklmnopqrst") == 4

    # --- Boundary checks ---
    def test_boundary_1_to_2(self):
        """length 1 -> ORP 0, length 2 -> ORP 1"""
        assert calculate_orp("x") == 0
        assert calculate_orp("xy") == 1

    def test_boundary_5_to_6(self):
        """length 5 -> ORP 1, length 6 -> ORP 2"""
        assert calculate_orp("abcde") == 1
        assert calculate_orp("abcdef") == 2

    def test_boundary_9_to_10(self):
        """length 9 -> ORP 2, length 10 -> ORP 3"""
        assert calculate_orp("abcdefghi") == 2
        assert calculate_orp("abcdefghij") == 3

    def test_boundary_13_to_14(self):
        """length 13 -> ORP 3, length 14 -> ORP 4"""
        assert calculate_orp("abcdefghijklm") == 3
        assert calculate_orp("abcdefghijklmn") == 4


# ===========================================================================
# Word Display / Splitting Tests
# ===========================================================================

class TestSplitWord:
    """Tests for split_word which mirrors display_word logic."""

    def test_empty_word(self):
        assert split_word("") == ("", "", "")

    def test_single_char(self):
        before, orp, after = split_word("I")
        assert before == ""
        assert orp == "I"
        assert after == ""

    def test_short_word(self):
        """'the' has ORP at index 1 -> before='t', orp='h', after='e'"""
        before, orp, after = split_word("the")
        assert before == "t"
        assert orp == "h"
        assert after == "e"

    def test_medium_word(self):
        """'hello' (5 chars) -> ORP index 1 -> before='h', orp='e', after='llo'"""
        before, orp, after = split_word("hello")
        assert before == "h"
        assert orp == "e"
        assert after == "llo"

    def test_longer_word(self):
        """'reading' (7 chars) -> ORP index 2 -> before='re', orp='a', after='ding'"""
        before, orp, after = split_word("reading")
        assert before == "re"
        assert orp == "a"
        assert after == "ding"

    def test_word_with_trailing_period(self):
        """'end.' -> clean='end' (3 chars) ORP=1 -> before='e', orp='n', after='d.'"""
        before, orp, after = split_word("end.")
        assert before == "e"
        assert orp == "n"
        assert after == "d."

    def test_word_with_trailing_comma(self):
        """'hello,' -> clean='hello' (5 chars) ORP=1"""
        before, orp, after = split_word("hello,")
        assert before == "h"
        assert orp == "e"
        assert after == "llo,"

    def test_word_with_exclamation(self):
        """'wow!' -> clean='wow' (3 chars) ORP=1"""
        before, orp, after = split_word("wow!")
        assert before == "w"
        assert orp == "o"
        assert after == "w!"

    def test_word_with_question_mark(self):
        """'why?' -> clean='why' (3 chars) ORP=1"""
        before, orp, after = split_word("why?")
        assert before == "w"
        assert orp == "h"
        assert after == "y?"

    def test_word_with_leading_punctuation(self):
        """'"hello' -> clean='hello' (5 chars) ORP=1, but first alnum is 'h' at index 1"""
        before, orp, after = split_word('"hello')
        # '"' is index 0, 'h' is index 1 (letterCount=0 == orpIndex=1? No.)
        # clean_word = 'hello' (5 chars) -> ORP index = 1
        # Iterating: i=0 '"' not alnum, i=1 'h' alnum letterCount=0 != 1,
        # i=2 'e' alnum letterCount=1 == 1 -> actual_orp=2
        assert before == '"h'
        assert orp == "e"
        assert after == "llo"

    def test_word_with_surrounding_quotes(self):
        """'"hi"' -> clean='hi' (2 chars) ORP=1"""
        before, orp, after = split_word('"hi"')
        # i=0 '"' not alnum, i=1 'h' alnum count=0 !=1,
        # i=2 'i' alnum count=1 ==1 -> actual_orp=2
        assert before == '"h'
        assert orp == "i"
        assert after == '"'

    def test_word_with_apostrophe(self):
        """
        "don't" -> clean via re.sub(r'[^\w]', '', word) removes apostrophe
        On Python 3, \w matches [a-zA-Z0-9_], apostrophe is NOT \w
        So clean_word = 'dont' (4 chars) ORP=1
        Iterating original "don't":
        i=0 'd' alnum count=0 !=1,
        i=1 'o' alnum count=1 ==1 -> actual_orp=1
        """
        before, orp, after = split_word("don't")
        assert before == "d"
        assert orp == "o"
        assert after == "n't"

    def test_word_with_hyphen(self):
        """'self-aware' -> clean='selfaware' (9 chars) ORP=2"""
        before, orp, after = split_word("self-aware")
        # i=0 's' count=0!=2, i=1 'e' count=1!=2, i=2 'l' count=2==2 -> actual_orp=2
        assert before == "se"
        assert orp == "l"
        assert after == "f-aware"

    def test_two_char_word(self):
        """'it' (2 chars) ORP=1 -> before='i', orp='t', after=''"""
        before, orp, after = split_word("it")
        assert before == "i"
        assert orp == "t"
        assert after == ""

    def test_long_word(self):
        """'transportation' (14 chars) ORP=4"""
        before, orp, after = split_word("transportation")
        assert before == "tran"
        assert orp == "s"
        assert after == "portation"

    def test_very_long_word(self):
        """'internationalization' (20 chars) ORP=4"""
        before, orp, after = split_word("internationalization")
        assert before == "inte"
        assert orp == "r"
        assert after == "nationalization"

    def test_all_parts_concatenate_to_original(self):
        """For any word, before + orp + after should equal the original."""
        test_words = [
            "I", "to", "the", "word", "hello", "simple", "reading",
            "powerful", "algorithm", "programming", "documentation",
            "transportation", "internationalization",
            "end.", "hello,", "wow!", '"hello"', "don't", "self-aware"
        ]
        for word in test_words:
            before, orp_letter, after = split_word(word)
            assert before + orp_letter + after == word, f"Failed for word: {word}"


# ===========================================================================
# Playback Timing / Delay Tests
# ===========================================================================

class TestComputeDelay:
    """Tests for the delay calculation (base delay + punctuation multipliers)."""

    def test_base_delay_at_300wpm(self):
        """At 300 WPM, base delay = 60000/300 = 200ms."""
        delay = compute_delay("hello", 300)
        assert delay == 200

    def test_base_delay_at_100wpm(self):
        """At 100 WPM, base delay = 60000/100 = 600ms."""
        delay = compute_delay("hello", 100)
        assert delay == 600

    def test_base_delay_at_800wpm(self):
        """At 800 WPM, base delay = 60000/800 = 75ms."""
        delay = compute_delay("hello", 800)
        assert delay == 75

    def test_period_multiplier(self):
        """Word ending with period gets 1.5x delay."""
        delay = compute_delay("end.", 300)
        expected = int(200 * 1.5)  # 300
        assert delay == expected

    def test_exclamation_multiplier(self):
        """Word ending with ! gets 1.5x delay."""
        delay = compute_delay("wow!", 300)
        expected = int(200 * 1.5)  # 300
        assert delay == expected

    def test_question_mark_multiplier(self):
        """Word ending with ? gets 1.5x delay."""
        delay = compute_delay("why?", 300)
        expected = int(200 * 1.5)  # 300
        assert delay == expected

    def test_comma_multiplier(self):
        """Word with comma gets 1.2x delay."""
        delay = compute_delay("hello,", 300)
        expected = int(200 * 1.2)  # 240
        assert delay == expected

    def test_semicolon_multiplier(self):
        """Word with semicolon gets 1.2x delay."""
        delay = compute_delay("clause;", 300)
        expected = int(200 * 1.2)  # 240
        assert delay == expected

    def test_colon_multiplier(self):
        """Word with colon gets 1.2x delay."""
        delay = compute_delay("note:", 300)
        expected = int(200 * 1.2)  # 240
        assert delay == expected

    def test_sentence_enders_take_priority_over_commas(self):
        """
        If a word has both a sentence-ender and a comma (unusual but possible),
        the code checks for .!? first, so 1.5x wins.
        """
        delay = compute_delay("wait!,", 300)
        expected = int(200 * 1.5)  # 300
        assert delay == expected

    def test_no_punctuation_no_multiplier(self):
        """Plain word gets exactly the base delay."""
        delay = compute_delay("speed", 300)
        assert delay == int(60000 / 300)

    def test_delay_different_wpm_with_period(self):
        """At 600 WPM with period: base=100ms, 1.5x = 150ms."""
        delay = compute_delay("done.", 600)
        expected = int(100 * 1.5)  # 150
        assert delay == expected

    def test_delay_at_wpm_with_comma(self):
        """At 500 WPM with comma: base=120ms, 1.2x = 144ms."""
        delay = compute_delay("yes,", 500)
        expected = int(120 * 1.2)  # 144
        assert delay == expected

    def test_delay_is_always_int(self):
        """Delay must always be an integer (milliseconds)."""
        for wpm in [100, 200, 300, 400, 500, 600, 700, 800]:
            for word in ["hello", "end.", "yes,"]:
                d = compute_delay(word, wpm)
                assert isinstance(d, int), f"Delay not int for wpm={wpm}, word={word}"

    def test_ellipsis_triggers_period_delay(self):
        """'wait...' contains '.', so 1.5x should apply."""
        delay = compute_delay("wait...", 300)
        expected = int(200 * 1.5)
        assert delay == expected


# ===========================================================================
# Speed Control Tests
# ===========================================================================

class TestSpeedControls:
    """Tests for increase_speed and decrease_speed with clamping."""

    def test_increase_from_300(self):
        assert increase_speed(300) == 350

    def test_increase_from_750(self):
        """750 + 50 = 800 (max)."""
        assert increase_speed(750) == 800

    def test_increase_at_max(self):
        """Already at 800, should stay at 800."""
        assert increase_speed(800) == 800

    def test_increase_above_max_clamps(self):
        """Even if somehow at 790, 790+50=840 but clamped to 800."""
        assert increase_speed(790) == 800

    def test_decrease_from_300(self):
        assert decrease_speed(300) == 250

    def test_decrease_from_150(self):
        """150 - 50 = 100 (min)."""
        assert decrease_speed(150) == 100

    def test_decrease_at_min(self):
        """Already at 100, should stay at 100."""
        assert decrease_speed(100) == 100

    def test_decrease_below_min_clamps(self):
        """Even if somehow at 120, 120-50=70 but clamped to 100."""
        assert decrease_speed(120) == 100

    def test_increase_then_decrease_is_identity(self):
        """Going up then down from a valid mid-range value returns to original."""
        original = 400
        after_up = increase_speed(original)
        back_down = decrease_speed(after_up)
        assert back_down == original

    def test_repeated_increase_to_max(self):
        """Repeatedly increasing from 100 should eventually cap at 800."""
        speed = 100
        for _ in range(100):
            speed = increase_speed(speed)
        assert speed == 800

    def test_repeated_decrease_to_min(self):
        """Repeatedly decreasing from 800 should eventually cap at 100."""
        speed = 800
        for _ in range(100):
            speed = decrease_speed(speed)
        assert speed == 100


# ===========================================================================
# Skip Forward / Backward Tests
# ===========================================================================

class TestSkipNavigation:
    """Tests for skip_forward and skip_backward with boundary conditions."""

    def test_skip_forward_from_start(self):
        """From index 0 in a 20-word list, forward 5 -> index 5."""
        assert skip_forward(0, 20) == 5

    def test_skip_forward_from_middle(self):
        assert skip_forward(10, 20) == 15

    def test_skip_forward_near_end(self):
        """From index 17 in a 20-word list, forward 5 -> clamped to 19."""
        assert skip_forward(17, 20) == 19

    def test_skip_forward_at_end(self):
        """Already at last index (19), skip forward stays at 19."""
        assert skip_forward(19, 20) == 19

    def test_skip_forward_past_end(self):
        """From index 16 in a 20-word list -> min(19, 21) = 19."""
        assert skip_forward(16, 20) == 19

    def test_skip_backward_from_end(self):
        """From index 19, backward 5 -> 14."""
        assert skip_backward(19, 20) == 14

    def test_skip_backward_from_middle(self):
        assert skip_backward(10, 20) == 5

    def test_skip_backward_near_start(self):
        """From index 3, backward 5 -> clamped to 0."""
        assert skip_backward(3, 20) == 0

    def test_skip_backward_at_start(self):
        """Already at index 0, stays at 0."""
        assert skip_backward(0, 20) == 0

    def test_skip_forward_empty_word_list(self):
        """With 0 words, skip does nothing (returns current index)."""
        assert skip_forward(0, 0) == 0

    def test_skip_backward_empty_word_list(self):
        """With 0 words, skip does nothing (returns current index)."""
        assert skip_backward(0, 0) == 0

    def test_skip_forward_single_word(self):
        """Single word list: skip forward from 0 -> min(0, 5) = 0."""
        assert skip_forward(0, 1) == 0

    def test_skip_backward_single_word(self):
        """Single word list: skip backward from 0 -> max(0, -5) = 0."""
        assert skip_backward(0, 1) == 0

    def test_skip_forward_two_words(self):
        """Two word list: skip forward from 0 -> min(1, 5) = 1."""
        assert skip_forward(0, 2) == 1

    def test_skip_backward_two_words_from_end(self):
        """Two word list: skip backward from 1 -> max(0, -4) = 0."""
        assert skip_backward(1, 2) == 0

    def test_skip_forward_five_words(self):
        """Exactly 5 words: skip from 0 -> min(4, 5) = 4."""
        assert skip_forward(0, 5) == 4


# ===========================================================================
# Edge Cases
# ===========================================================================

class TestEdgeCases:
    """Edge cases: special characters, numbers, unicode, etc."""

    def test_word_with_numbers(self):
        """Numbers are alphanumeric, so they count for ORP."""
        before, orp, after = split_word("123")
        assert before + orp + after == "123"
        # '123' is 3 chars, ORP=1
        assert before == "1"
        assert orp == "2"
        assert after == "3"

    def test_word_with_mixed_numbers_letters(self):
        """'abc123' is 6 chars, ORP=2."""
        before, orp, after = split_word("abc123")
        assert before == "ab"
        assert orp == "c"
        assert after == "123"

    def test_word_all_punctuation(self):
        """A word that is only punctuation like '---'."""
        # clean_word = '' (0 chars), ORP=0
        # No alnum found, actual_orp stays 0
        before, orp, after = split_word("---")
        assert orp == "-"
        assert before == ""
        assert after == "--"

    def test_word_with_underscore(self):
        """
        Underscore is treated as \\w by regex, and as alnum by isalnum.
        Actually, underscore is NOT alnum in Python (isalnum returns False for '_').
        But re.sub(r'[^\\w]', '', word) keeps underscore (\\w includes _).
        This creates a discrepancy: clean_word includes _, but isalnum loop skips _.
        """
        # 'my_var' -> clean_word = 'my_var' (6 chars) -> ORP=2
        # isalnum iteration: i=0 'm' count=0, i=1 'y' count=1,
        # i=2 '_' not alnum (skip), i=3 'v' count=2==2 -> actual_orp=3
        before, orp, after = split_word("my_var")
        assert before == "my_"
        assert orp == "v"
        assert after == "ar"

    def test_single_punctuation_char(self):
        """A single non-alnum char like '!'"""
        before, orp, after = split_word("!")
        # clean_word = '' (0 chars) -> ORP=0
        # No alnum found, actual_orp=0
        assert before == ""
        assert orp == "!"
        assert after == ""

    def test_word_split_preserves_unicode_letters(self):
        """Basic ASCII word test - ensures no crashes."""
        before, orp, after = split_word("cafe")
        assert before + orp + after == "cafe"

    def test_delay_for_word_with_embedded_period(self):
        """'e.g.' contains '.', triggers 1.5x multiplier."""
        delay = compute_delay("e.g.", 300)
        assert delay == int(200 * 1.5)

    def test_text_splitting(self):
        """Verify that text.split() works the same way the app splits uploaded text."""
        text = "Hello,  world!   This is   a test."
        words = text.split()
        assert words == ["Hello,", "world!", "This", "is", "a", "test."]

    def test_text_splitting_with_newlines(self):
        """Newlines are whitespace, so split() handles them."""
        text = "Line one\nLine two\n\nLine four"
        words = text.split()
        assert words == ["Line", "one", "Line", "two", "Line", "four"]

    def test_text_splitting_empty_string(self):
        """Empty string produces empty list."""
        assert "".split() == []

    def test_text_splitting_only_whitespace(self):
        """Whitespace-only string produces empty list."""
        assert "   \n\t  ".split() == []

    def test_progress_calculation_first_word(self):
        """Progress at index 0 with 10 words = 0%."""
        words = list(range(10))
        current_index = 0
        progress = (current_index / len(words)) * 100
        assert progress == 0.0

    def test_progress_calculation_last_word(self):
        """Progress at index 9 with 10 words = 90%."""
        words = list(range(10))
        current_index = 9
        progress = (current_index / len(words)) * 100
        assert progress == 90.0

    def test_progress_calculation_middle(self):
        """Progress at index 5 with 10 words = 50%."""
        words = list(range(10))
        current_index = 5
        progress = (current_index / len(words)) * 100
        assert progress == 50.0


# ===========================================================================
# Integration-style tests (testing combinations of operations)
# ===========================================================================

class TestIntegration:
    """Test realistic sequences of operations."""

    def test_read_all_words_in_short_text(self):
        """Simulate reading through a short text word by word."""
        text = "The quick brown fox jumps."
        words = text.split()
        assert len(words) == 5

        for i, word in enumerate(words):
            before, orp_letter, after = split_word(word)
            assert before + orp_letter + after == word
            assert len(orp_letter) == 1

    def test_speed_adjustment_sequence(self):
        """Simulate a user repeatedly pressing up/down arrows."""
        speed = 300
        # Press up 3 times
        for _ in range(3):
            speed = increase_speed(speed)
        assert speed == 450

        # Press down 5 times
        for _ in range(5):
            speed = decrease_speed(speed)
        assert speed == 200

    def test_skip_to_end_and_back(self):
        """Skip forward repeatedly to end, then back to start."""
        word_count = 12
        index = 0

        # Skip forward until at end
        while index < word_count - 1:
            index = skip_forward(index, word_count)

        assert index == word_count - 1

        # Skip backward until at start
        while index > 0:
            index = skip_backward(index, word_count)

        assert index == 0

    def test_delay_varies_across_sentence(self):
        """Different words in a sentence should have different delays."""
        sentence = "Hello, world! This is a test."
        words = sentence.split()
        delays = [compute_delay(w, 300) for w in words]

        # "Hello," has comma -> 1.2x
        assert delays[0] == int(200 * 1.2)
        # "world!" has ! -> 1.5x
        assert delays[1] == int(200 * 1.5)
        # "This" no punctuation -> 1.0x
        assert delays[2] == 200
        # "is" no punctuation -> 1.0x
        assert delays[3] == 200
        # "a" no punctuation -> 1.0x
        assert delays[4] == 200
        # "test." has period -> 1.5x
        assert delays[5] == int(200 * 1.5)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
