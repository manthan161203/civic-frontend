# Device verification checklist

Things that **cannot** be verified on this machine, and why.

There is no iOS simulator here — this is Linux, and `simctl` requires macOS and
Xcode. The Android SDK is not installed either. But two of the three areas below
would not be trustworthy on an emulator regardless:

- **Haptics do not exist on any simulator or emulator.** There is no vibration
  motor to drive. Feeling them is the only test.
- **Safe-area insets are device-geometry.** A generic AVD has no notch, no
  Dynamic Island and no home indicator, so the bugs this release fixes would not
  reproduce there.

Keyboard behaviour is the one that an emulator handles adequately — but since
you are holding the phone anyway, it is included.

## Running it

```bash
cd mobile
npx expo start
```

Scan the QR with Expo Go. Point it at a reachable backend — `localhost` from a
phone means the phone, so use your machine's LAN address:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.x:8000 npx expo start
```

Run the whole list on **one iPhone and one Android device**. Where they differ,
that is the finding.

---

## 1. Safe areas

`react-native-safe-area-context` was installed and imported by nothing. Two
screens used the deprecated core `SafeAreaView`, which is a no-op on Android —
and Expo SDK 54 turns on Android edge-to-edge by default, so this was broken on
both platforms in different ways.

| # | Check | Looking for |
|---|---|---|
| 1.1 | Open the app on a notched iPhone | No content behind the notch or Dynamic Island |
| 1.2 | Home feed — scroll to the bottom | The last card clears the tab bar; the two FABs sit above the home indicator, not under it |
| 1.3 | Trigger a toast (rate a resolved issue) | It appears **above** the tab bar, not behind it |
| 1.4 | Turn on airplane mode | The offline banner sits **below** the status bar, not under it |
| 1.5 | Same on Android with gesture navigation | FABs clear the gesture pill |
| 1.6 | Android with 3-button navigation | Nothing hidden behind the nav bar |
| 1.7 | Rotate to landscape | Nothing clipped by the notch on the leading edge |

## 2. Haptics

The app previously had one `Vibration.vibrate([0,200,100,200])` — a 500 ms buzz
on the SOS button — and nothing else. Tapping a tab, upvoting and failing a form
all felt identical.

The risk being tested for is **over-haptics**: too many, or too strong, and
people disable the setting, which also kills the ones that matter.

| # | Action | Expected |
|---|---|---|
| 2.1 | Tap a status filter chip | The lightest possible tick |
| 2.2 | Switch My issues ↔ Following | Same light tick |
| 2.3 | Tap a star to rate | A light tap, then a distinct success on the response |
| 2.4 | Tap Close on a resolved issue | A firmer press, then success |
| 2.5 | Tap the report FAB | A firmer press |
| 2.6 | Confirm SOS | A warning pattern — clearly different from success |
| 2.7 | Force a failure (airplane mode, then Close) | An error pattern, distinct from both |
| 2.8 | **Scroll the feed fast** | **Nothing.** Any haptic here is a bug |
| 2.9 | Pull to refresh | One tick at the start, not a stream |
| 2.10 | Android overall | Report if it feels noisier or blunter than iOS — Android's engine is coarser and `haptics.js` has a flag to soften it |

## 3. Keyboard

| # | Check | Looking for |
|---|---|---|
| 3.1 | Home feed → tap search | The field stays visible above the keyboard |
| 3.2 | Tap outside the field | Taps register on the list (`keyboardShouldPersistTaps`) |
| 3.3 | **Report screen → tap the description box** | **This is the big one.** That screen had no `KeyboardAvoidingView` at all — 930 lines and seven inputs. See the note below |
| 3.4 | Android with a floating/split keyboard | Layout does not break |

> **Report screen is not yet fixed.** It is the worst keyboard defect in the app
> and it is still outstanding — see "Not done" at the end. Check 3.3 to confirm
> the current behaviour, not to verify a fix.

## 4. Loading, empty and error states

| # | Setup | Expected |
|---|---|---|
| 4.1 | Cold-start the home feed | **Skeleton cards** shaped like real rows — not a spinner, and the header stays put |
| 4.2 | Watch the moment data lands | No jump. The skeleton is the same height as the row |
| 4.3 | Stop the backend, pull to refresh | An error panel with **Try again**, not an empty list |
| 4.4 | Airplane mode, pull to refresh | "You're offline" — and **no** Try again button, because it could not work |
| 4.5 | Tap Try again with the backend back | Content loads |
| 4.6 | A citizen with no reports | Empty state with a **Report an issue** button, not a bare "No issues found" |
| 4.7 | Filter to something with no matches | Different wording from 4.6 — it should suggest clearing the filter |

## 5. Offline queue

Already built and tested server-side; this confirms it end-to-end on a real
radio rather than a simulated one.

| # | Steps | Expected |
|---|---|---|
| 5.1 | Airplane mode → report an issue | Accepted, with a "will send when you reconnect" message |
| 5.2 | Still offline, force-quit and reopen | The queued report survives |
| 5.3 | Turn airplane mode off | Banner turns to "retrying", then clears; the issue appears in the feed |
| 5.4 | Check the issue's timestamp | It is **when you wrote it**, not when it synced — SLA counts from there |
| 5.5 | Attach a photo offline, then reconnect | The photo lands on the same issue |
| 5.6 | The SOS button while offline | Disabled. An SOS that silently fails is the worst possible outcome |

## 6. Touch targets

Every interactive element should be at least 44pt (iOS HIG) / 48dp (Material).

| # | Check |
|---|---|
| 6.1 | Star rating — each star hittable without hitting its neighbour |
| 6.2 | Search "clear" ✕ — hittable with a thumb |
| 6.3 | Filter chips — no mis-taps between adjacent chips |

## 7. Accessibility

| # | Check | Expected |
|---|---|---|
| 7.1 | VoiceOver / TalkBack on the home feed | Filter chips announce their selected state |
| 7.2 | Swipe to the skeleton while loading | Announced once as "Loading issues", not a dozen separate elements |
| 7.3 | Trigger a toast | Announced without stealing focus |
| 7.4 | Settings → **Reduce Motion** on, reload | Skeletons stop pulsing |
| 7.5 | Largest Dynamic Type / font size | Nothing clipped in the filter row or the tab bar |

---

## What to send back

For anything that fails: **which device, which OS version, and what happened**.
Screenshots help most for the safe-area items; for haptics a sentence is enough
("2.6 felt the same as 2.4" is exactly the kind of finding this list is for).

## Not done yet — do not test as if fixed

These are known outstanding, listed so you are not hunting for bugs I already
know about:

- `(citizen)/report.jsx` — **no `KeyboardAvoidingView`**, seven text inputs. The
  worst remaining defect in the app.
- `(worker)/notifications.jsx` — `refreshing={false}` is hardcoded, so
  pull-to-refresh gives no feedback that it ran.
- Both `profile.jsx` screens and `(worker)/rewards.jsx` — no pull-to-refresh.
- ~30 screens still use `Alert.alert` for errors rather than the toast, and
  several still swallow load failures into an empty list.
- Only the citizen home feed has been through the full treatment; the other
  screens have the foundation available but have not been converted.
