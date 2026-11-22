// One labelled text box on the sign-in pages: email, password (with Show / Hide), a new password, the emailed code,
// or a username. Each kind tells the phone what it holds, so password managers and code autofill work.

import { useState, type ComponentRef, type Ref } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { account } from '@/theme/accountColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** The text box itself, for a page that moves the cursor into it. */
export type AuthFieldBox = ComponentRef<typeof TextInput>;

/** What a box holds. */
export type AuthFieldKind = 'email' | 'password' | 'newPassword' | 'code' | 'username';

/** The phone's settings for each kind of box. */
const KINDS: Record<AuthFieldKind, TextInputProps> = {
  email: { textContentType: 'emailAddress', autoComplete: 'email', keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false },
  password: { textContentType: 'password', autoComplete: 'current-password', autoCapitalize: 'none', autoCorrect: false },
  newPassword: { textContentType: 'newPassword', autoComplete: 'new-password', autoCapitalize: 'none', autoCorrect: false },
  code: { textContentType: 'oneTimeCode', autoComplete: 'one-time-code', keyboardType: 'number-pad', maxLength: 6 },
  username: { textContentType: 'nickname', autoComplete: 'off', autoCapitalize: 'none', autoCorrect: false, spellCheck: false },
};

/** Props for a text box. */
type AuthFieldProps = {
  /** What the box is for, shown above it and read out by screen readers. */
  label: string;
  /** What the box holds, which sets the keyboard and autofill. */
  kind: AuthFieldKind;
  /** What is typed. */
  value: string;
  /** Runs as the person types. */
  onChange: (value: string) => void;
  /** The grey hint while the box is empty. */
  placeholder?: string;
  /** A small line under the box, like the password rule. */
  note?: string;
  /** The note's look: plain, a problem, or good news. */
  noteTone?: 'plain' | 'problem' | 'good';
  /** Runs when the keyboard's next or done key is pressed. */
  onSubmit?: () => void;
  /** The keyboard's action key. */
  returnKeyType?: TextInputProps['returnKeyType'];
  /** The longest text allowed. */
  maxLength?: number;
  /** Lets the page move the cursor into this box, like from Email to Password on the keyboard's Next key. */
  inputRef?: Ref<AuthFieldBox>;
};

/** A labelled text box. */
export function AuthField({ label, kind, value, onChange, placeholder, note, noteTone = 'plain', onSubmit, returnKeyType = 'next', maxLength, inputRef }: AuthFieldProps) {
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const secret = kind === 'password' || kind === 'newPassword';
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, focused && styles.focused]}>
        <TextInput
          {...KINDS[kind]}
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={account.hint}
          secureTextEntry={secret && !shown}
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmit}
          submitBehavior={returnKeyType === 'next' ? 'submit' : 'blurAndSubmit'}
          returnKeyType={returnKeyType}
          maxLength={maxLength ?? KINDS[kind].maxLength}
          style={styles.input}
        />
        {secret && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shown ? 'Hide password' : 'Show password'}
            onPress={() => {
              playSound('tap');
              setShown((s) => !s);
            }}
            hitSlop={8}
            style={styles.show}
          >
            <Text style={styles.showText}>{shown ? 'Hide' : 'Show'}</Text>
          </Pressable>
        )}
      </View>
      {note ? <Text style={[styles.note, noteTone === 'problem' && styles.problem, noteTone === 'good' && styles.good]}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { fontFamily: fonts.extraBold, fontSize: 13.5, color: text.onDarkSoft },
  box: { height: 54, flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, borderColor: account.fieldEdge, backgroundColor: account.fieldFill, paddingLeft: 16, paddingRight: 8 },
  focused: { borderColor: account.fieldFocus },
  input: { flex: 1, height: '100%', fontFamily: fonts.bold, fontSize: 17, color: text.onDark },
  show: { paddingVertical: 8, paddingHorizontal: 10 },
  showText: { fontFamily: fonts.extraBold, fontSize: 13.5, color: text.goldNote },
  note: { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 17, color: text.onDarkSoft },
  problem: { color: account.problem },
  good: { color: account.good },
});
