use soroban_sdk::symbol_short;

#[test]
fn test_event_topics_are_unique() {
    let topics = [
        symbol_short!("gamestart"),
        symbol_short!("guesssub"),
        symbol_short!("gamewin"),
        symbol_short!("gameloss"),
    ];

    for i in 0..topics.len() {
        for j in (i + 1)..topics.len() {
            assert_ne!(topics[i], topics[j], "duplicate event topic found");
        }
    }
}
