import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Fonts, Radius } from "@/constants/Colors";
import { api, UserOut, VerificationStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/Button";

export function VerifyWizard() {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await api<VerificationStatus>("/api/me/account/verification");
      setStatus(s);
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus().finally(() => setLoading(false));
  }, [fetchStatus]);

  const handleStepDone = () => {
    setExpanded(null);
    fetchStatus();
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 32 }} color={Colors.terra} />;
  }
  if (!status) return null;

  const doneCount = status.steps.filter((s) => s.done).length;

  return (
    <View>
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${status.steps.length ? (doneCount / status.steps.length) * 100 : 0}%` },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {doneCount} of {status.steps.length} complete
        </Text>
      </View>

      {status.steps.map((step) => (
        <View key={step.key} style={styles.stepCard}>
          <TouchableOpacity
            style={styles.stepHeader}
            activeOpacity={0.75}
            disabled={step.done}
            onPress={() => setExpanded(expanded === step.key ? null : step.key)}
          >
            <Ionicons
              name={step.done ? "checkmark-circle" : "ellipse-outline"}
              size={24}
              color={step.done ? Colors.success : Colors.charcoal3}
            />
            <View style={styles.stepInfo}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepHint}>{step.done ? "Completed" : step.hint}</Text>
            </View>
            {step.required && !step.done && (
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            )}
            {!step.done && (
              <Ionicons
                name={expanded === step.key ? "chevron-up" : "chevron-down"}
                size={18}
                color={Colors.charcoal3}
              />
            )}
          </TouchableOpacity>

          {step.key === "payout" && step.status === "pending" && (
            <View style={styles.pendingBanner}>
              <Ionicons name="time-outline" size={14} color={Colors.terra} />
              <Text style={styles.pendingText}>Saved — pending review. You can continue in the meantime.</Text>
            </View>
          )}

          {expanded === step.key && !step.done && (
            <View style={styles.stepForm}>
              {step.key === "phone" && <PhoneStepForm onDone={handleStepDone} />}
              {step.key === "email" && <EmailStepForm onDone={handleStepDone} />}
              {step.key === "aadhaar" && <AadhaarStepForm onDone={handleStepDone} />}
              {step.key === "pan" && <PanStepForm onDone={handleStepDone} />}
              {step.key === "payout" && <PayoutStepForm onDone={handleStepDone} />}
            </View>
          )}
        </View>
      ))}

      {!status.eligible ? (
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={18} color={Colors.terra} />
          <Text style={styles.warningText}>Complete all required steps to continue.</Text>
        </View>
      ) : (
        <View style={styles.successBox}>
          <Ionicons name="shield-checkmark" size={18} color={Colors.success} />
          <Text style={styles.successText}>You're all set — every required step is complete.</Text>
        </View>
      )}
    </View>
  );
}

function PhoneStepForm({ onDone }: { onDone: () => void }) {
  const { requestOtp, verifyOtp, user } = useAuth();
  const [stage, setStage] = useState<"identifier" | "code">("identifier");
  const [phone, setPhone] = useState(user?.phone?.replace(/\D/g, "").slice(-10) || "");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const digits = phone.replace(/\D/g, "");
  const validPhone = digits.length === 10;

  const send = async () => {
    if (!validPhone) return;
    setBusy(true);
    setErr(null);
    try {
      const dev = await requestOtp(digits);
      if (dev) setDevCode(dev);
      setStage("code");
    } catch (e: any) {
      setErr(e.message || "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (code.length < 4) return;
    setBusy(true);
    setErr(null);
    try {
      await verifyOtp(digits, code);
      onDone();
    } catch (e: any) {
      setErr(e.message || "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  return stage === "identifier" ? (
    <View>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="number-pad"
        placeholder="98765 43210"
        placeholderTextColor={Colors.charcoal3}
        style={styles.formInput}
      />
      {err && <Text style={styles.formError}>{err}</Text>}
      <Button title={busy ? "Sending…" : "Send code"} onPress={send} disabled={!validPhone || busy} loading={busy} full style={{ marginTop: 12 }} />
    </View>
  ) : (
    <View>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        placeholder="Enter code"
        placeholderTextColor={Colors.charcoal3}
        textContentType="oneTimeCode"
        style={styles.formInput}
      />
      {devCode && <Text style={styles.devCode}>Dev code: {devCode}</Text>}
      {err && <Text style={styles.formError}>{err}</Text>}
      <Button title={busy ? "Verifying…" : "Verify"} onPress={verify} disabled={code.length < 4 || busy} loading={busy} full style={{ marginTop: 12 }} />
    </View>
  );
}

// Attaches the email to the signed-in account. Deliberately not the email-OTP
// *login* endpoints: those would swap the session to whichever account owns
// the address. An address owned by another account is refused (409).
function EmailStepForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [stage, setStage] = useState<"identifier" | "code">("identifier");
  const [email, setEmail] = useState(user?.email || "");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const normEmail = email.trim().toLowerCase();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail);

  const send = async () => {
    if (!validEmail) return;
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      const res = await api<{ ok: boolean; dev_code?: string | null }>("/api/auth/email/add/request", {
        method: "POST",
        body: { email: normEmail },
      });
      setDevCode(res.dev_code || null);
      if (stage === "code") setNotice("We sent a new code.");
      setStage("code");
    } catch (e: any) {
      setErr(e.message || "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (code.length < 4) return;
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      const me = await api<UserOut>("/api/auth/email/add/verify", {
        method: "POST",
        body: { email: normEmail, code },
      });
      useAuth.setState({ user: me });
      onDone();
    } catch (e: any) {
      setErr(e.message || "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  return stage === "identifier" ? (
    <View>
      <TextInput
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="you@example.com"
        placeholderTextColor={Colors.charcoal3}
        style={styles.formInput}
      />
      {err && <Text style={styles.formError}>{err}</Text>}
      <Button title={busy ? "Sending…" : "Send code"} onPress={send} disabled={!validEmail || busy} loading={busy} full style={{ marginTop: 12 }} />
    </View>
  ) : (
    <View>
      <Text style={styles.sentTo}>
        We sent a 6-digit code to <Text style={{ fontWeight: "800" }}>{normEmail}</Text>
      </Text>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
        onSubmitEditing={verify}
        keyboardType="number-pad"
        placeholder="6-digit code"
        placeholderTextColor={Colors.charcoal3}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        accessibilityLabel="6-digit code"
        autoFocus
        style={[styles.formInput, { textAlign: "center", letterSpacing: 4 }]}
      />
      {devCode && <Text style={styles.devCode}>Dev code: {devCode}</Text>}
      {notice && <Text style={styles.devCode}>{notice}</Text>}
      {err && <Text style={styles.formError}>{err}</Text>}
      <Button title={busy ? "Confirming…" : "Confirm email"} onPress={verify} disabled={code.length < 4 || busy} loading={busy} full style={{ marginTop: 12 }} />
      <View style={styles.linksRow}>
        <TouchableOpacity onPress={send} disabled={busy}>
          <Text style={styles.linkText}>Resend code</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setStage("identifier"); setCode(""); setErr(null); setNotice(null); }}>
          <Text style={styles.linkText}>Change email</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AadhaarStepForm({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<"identifier" | "code">("identifier");
  const [aadhaar, setAadhaar] = useState("");
  const [txnId, setTxnId] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const digits = aadhaar.replace(/\D/g, "");
  const valid = digits.length === 12;

  const send = async () => {
    if (!valid) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{ txn_id: string; dev_otp?: string | null }>("/api/kyc/aadhaar/start", {
        method: "POST",
        body: { aadhaar: digits },
      });
      setTxnId(res.txn_id);
      if (res.dev_otp) setDevOtp(res.dev_otp);
      setStage("code");
    } catch (e: any) {
      setErr(e.message || "Could not send OTP");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (otp.length < 4) return;
    setBusy(true);
    setErr(null);
    try {
      await api("/api/kyc/aadhaar/verify", { method: "POST", body: { txn_id: txnId, otp } });
      onDone();
    } catch (e: any) {
      setErr(e.message || "Invalid OTP");
    } finally {
      setBusy(false);
    }
  };

  return stage === "identifier" ? (
    <View>
      <TextInput
        value={aadhaar}
        onChangeText={(t) => setAadhaar(t.replace(/\D/g, "").slice(0, 12))}
        keyboardType="number-pad"
        placeholder="12-digit Aadhaar number"
        placeholderTextColor={Colors.charcoal3}
        style={styles.formInput}
      />
      {err && <Text style={styles.formError}>{err}</Text>}
      <Button title={busy ? "Sending…" : "Send OTP"} onPress={send} disabled={!valid || busy} loading={busy} full style={{ marginTop: 12 }} />
    </View>
  ) : (
    <View>
      <TextInput
        value={otp}
        onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 8))}
        keyboardType="number-pad"
        placeholder="Enter OTP"
        placeholderTextColor={Colors.charcoal3}
        style={styles.formInput}
      />
      {devOtp && <Text style={styles.devCode}>Dev OTP: {devOtp}</Text>}
      {err && <Text style={styles.formError}>{err}</Text>}
      <Button title={busy ? "Verifying…" : "Verify"} onPress={verify} disabled={otp.length < 4 || busy} loading={busy} full style={{ marginTop: 12 }} />
    </View>
  );
}

function PanStepForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [pan, setPan] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const validPan = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.trim());

  const submit = async () => {
    if (!validPan || !name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await api("/api/kyc/pan", { method: "POST", body: { pan: pan.trim(), name: name.trim() } });
      onDone();
    } catch (e: any) {
      setErr(e.message || "Could not verify PAN");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <TextInput
        value={pan}
        onChangeText={(t) => setPan(t.toUpperCase().slice(0, 10))}
        autoCapitalize="characters"
        placeholder="AAAAA9999A"
        placeholderTextColor={Colors.charcoal3}
        style={styles.formInput}
      />
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name as on PAN"
        placeholderTextColor={Colors.charcoal3}
        style={[styles.formInput, { marginTop: 10 }]}
      />
      <Text style={[styles.stepHint, { marginTop: 8 }]}>Enter your name exactly as it's printed on your PAN card.</Text>
      {err && <Text style={styles.formError}>{err}</Text>}
      <Button title={busy ? "Verifying…" : "Verify PAN"} onPress={submit} disabled={!validPan || !name.trim() || busy} loading={busy} full style={{ marginTop: 12 }} />
    </View>
  );
}

function PayoutStepForm({ onDone }: { onDone: () => void }) {
  const [tab, setTab] = useState<"upi" | "bank">("upi");
  const [vpa, setVpa] = useState("");
  const [account, setAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const validVpa = /^[\w.\-]+@[\w.\-]+$/.test(vpa.trim());
  const validIfsc = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim());
  const valid = tab === "upi" ? validVpa : account.trim().length >= 6 && validIfsc && name.trim().length >= 2;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setErr(null);
    try {
      if (tab === "upi") {
        await api("/api/kyc/upi", { method: "POST", body: { vpa: vpa.trim() } });
      } else {
        await api("/api/kyc/bank", {
          method: "POST",
          body: { account: account.trim(), ifsc: ifsc.trim(), name: name.trim() },
        });
      }
      onDone();
    } catch (e: any) {
      setErr(e.message || "Could not save payout method");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View style={styles.payoutTabs}>
        <TouchableOpacity style={[styles.payoutTab, tab === "upi" && styles.payoutTabActive]} onPress={() => setTab("upi")}>
          <Text style={[styles.payoutTabText, tab === "upi" && styles.payoutTabTextActive]}>UPI</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.payoutTab, tab === "bank" && styles.payoutTabActive]} onPress={() => setTab("bank")}>
          <Text style={[styles.payoutTabText, tab === "bank" && styles.payoutTabTextActive]}>Bank account</Text>
        </TouchableOpacity>
      </View>

      {tab === "upi" ? (
        <TextInput
          value={vpa}
          onChangeText={setVpa}
          autoCapitalize="none"
          placeholder="yourname@upi"
          placeholderTextColor={Colors.charcoal3}
          style={styles.formInput}
        />
      ) : (
        <>
          <TextInput
            value={account}
            onChangeText={setAccount}
            keyboardType="number-pad"
            placeholder="Account number"
            placeholderTextColor={Colors.charcoal3}
            style={styles.formInput}
          />
          <TextInput
            value={ifsc}
            onChangeText={(t) => setIfsc(t.toUpperCase())}
            autoCapitalize="characters"
            placeholder="IFSC (e.g. HDFC0001234)"
            placeholderTextColor={Colors.charcoal3}
            style={[styles.formInput, { marginTop: 10 }]}
          />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Account holder name"
            placeholderTextColor={Colors.charcoal3}
            style={[styles.formInput, { marginTop: 10 }]}
          />
        </>
      )}
      {err && <Text style={styles.formError}>{err}</Text>}
      <Button title={busy ? "Saving…" : "Save payout method"} onPress={submit} disabled={!valid || busy} loading={busy} full style={{ marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.edge,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.terra,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.charcoal2,
    marginTop: 6,
  },
  stepCard: {
    marginBottom: 12,
    backgroundColor: Colors.paper,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.edge,
    overflow: "hidden",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  stepInfo: { flex: 1 },
  stepLabel: { fontSize: 15, fontWeight: "700", color: Colors.charcoal },
  stepHint: { fontSize: 12, color: Colors.charcoal2, marginTop: 2 },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.warmBg,
  },
  requiredText: { fontSize: 10, fontWeight: "800", color: Colors.terra, textTransform: "uppercase" },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  pendingText: { fontSize: 12, color: Colors.terra, fontWeight: "600", flex: 1 },
  stepForm: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
    paddingTop: 16,
  },
  formInput: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    backgroundColor: Colors.cream,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  formError: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 8,
    fontWeight: "600",
  },
  devCode: {
    fontSize: 12,
    color: Colors.charcoal3,
    marginTop: 8,
  },
  sentTo: {
    fontSize: 12.5,
    color: Colors.charcoal2,
    marginBottom: 10,
  },
  linksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.charcoal2,
    textDecorationLine: "underline",
  },
  payoutTabs: {
    flexDirection: "row",
    marginBottom: 10,
    padding: 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  payoutTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  payoutTabActive: {
    backgroundColor: Colors.paper,
  },
  payoutTabText: { fontSize: 12, fontWeight: "800", color: Colors.charcoal3 },
  payoutTabTextActive: { color: Colors.charcoal },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    marginTop: 8,
    backgroundColor: Colors.warmBg,
    borderRadius: Radius.md,
  },
  warningText: { fontSize: 13, color: Colors.terra, flex: 1, fontWeight: "600" },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    marginTop: 8,
    backgroundColor: "#dcfce7",
    borderRadius: Radius.md,
  },
  successText: { fontSize: 13, color: Colors.success, flex: 1, fontWeight: "600" },
});
