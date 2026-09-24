use proptest::prelude::*;

#[derive(Debug, PartialEq, Clone, Copy)]
enum LetterState { Green, Yellow, Gray }

fn evaluate(target: &[u8; 5], guess: &[u8; 5]) -> [LetterState; 5] {
    let mut result = [LetterState::Gray; 5];
    let mut used = [false; 5];

    for i in 0..5 {
        if guess[i] == target[i] {
            result[i] = LetterState::Green;
            used[i] = true;
        }
    }
    for i in 0..5 {
        if result[i] == LetterState::Green { continue; }
        for j in 0..5 {
            if !used[j] && guess[i] == target[j] {
                result[i] = LetterState::Yellow;
                used[j] = true;
                break;
            }
        }
    }
    result
}

proptest! {
    #[test]
    fn feedback_has_five_entries(t in prop::array::uniform5(b'a'..=b'z'), g in prop::array::uniform5(b'a'..=b'z')) {
        prop_assert_eq!(evaluate(&t, &g).len(), 5);
    }

    #[test]
    fn exact_match_is_always_green(w in prop::array::uniform5(b'a'..=b'z')) {
        prop_assert!(evaluate(&w, &w).iter().all(|s| *s == LetterState::Green));
    }
}
