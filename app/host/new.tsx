// New listing, one topic per screen — the app version of the website's
// step-by-step flow (aangan-master/frontend/app/host/new/page.tsx). Later
// screens adapt to earlier answers: a room skips bedrooms, a kitchen or meals
// open the food questions, the state unlocks its registration field, the
// price shows its GST band. Progress is kept on the phone so a host can leave
// and come back.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, LayoutAnimation,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { fmtTime, gstNote, inr, isHHMM } from "@/lib/format";
import { CancellationChoice, type CancellationPolicy } from "@/components/CancellationChoice";
import { BookingModeChoice } from "@/components/BookingModeChoice";
import { PayoutPreview } from "@/components/PayoutPreview";
import { EMPTY_HOUSE_RULES, HouseRulesEditor, type HouseRulesValue } from "@/components/HouseRules";
import { EMPTY_MEAL_PLANS, MealPlansEditor, mealPlansError, mealPlansPayload, mealPlansSummary,
         type MealPlansValue } from "@/components/MealPlansEditor";
import { verificationMissing, describeMissing } from "@/lib/hostVerification";
import { Colors, Radius } from "@/constants/Colors";
import { AMENITIES } from "@/constants/Amenities";
import { Button } from "@/components/Button";
import { PhotoPicker, Photo } from "@/components/PhotoPicker";
import { StatePinFields, useStates } from "@/components/StatePinFields";
import { ListingGst, type GstStatus } from "@/components/ListingGst";

// ── Choices (same as the website) ────────────────────────────────────────────
const TYPE_CARDS: { value: string; title: string; line: string; room?: boolean; scene?: string; icon: string }[] = [
  { value: "Entire villa", title: "Villa", line: "A whole house with its own grounds", icon: "home-outline" },
  { value: "Entire cabin", title: "Cottage or cabin", line: "A small whole home, often in nature", icon: "leaf-outline" },
  { value: "Entire apartment", title: "Apartment", line: "A whole flat in a building", icon: "business-outline" },
  { value: "Entire farmhouse", title: "Farmhouse", line: "A home on farmland or an estate", icon: "flower-outline" },
  { value: "Private room", title: "Room in a home", line: "Guests have their own room; you or others live there", room: true, icon: "bed-outline" },
  { value: "Heritage suite", title: "Heritage suite", line: "A suite in a haveli, palace or old house", room: true, scene: "heritage", icon: "library-outline" },
  { value: "Entire houseboat", title: "Houseboat", line: "A boat on the backwaters or a lake", scene: "backwater", icon: "boat-outline" },
];
const SCENE_CARDS: { value: string; title: string; line: string }[] = [
  { value: "mountain", title: "Mountains", line: "Hills, valleys, snow" },
  { value: "beach", title: "Beach", line: "Near the sea" },
  { value: "city", title: "City", line: "In or near town" },
  { value: "forest", title: "Forest", line: "Woods, plantations" },
  { value: "lake", title: "Lakeside", line: "On or near a lake" },
  { value: "backwater", title: "Backwaters", line: "Canals and lagoons" },
  { value: "desert", title: "Desert", line: "Dunes, open land" },
  { value: "heritage", title: "Heritage", line: "Forts, havelis" },
];
const POPULAR: Record<string, string[]> = {
  mountain: ["Heater", "Mountain view", "Bonfire", "Fireplace", "Power backup", "Wifi"],
  beach: ["Sea view", "Air conditioning", "Pool", "Wifi", "Free parking", "Breakfast"],
  city: ["Wifi", "Air conditioning", "Workspace", "Kitchen", "Elevator", "Laundry"],
  forest: ["Estate walks", "Bonfire", "Power backup", "Breakfast", "All meals", "Free parking"],
  lake: ["Lake view", "Wifi", "Breakfast", "Free parking", "Yoga deck", "Bonfire"],
  backwater: ["All meals", "Air conditioning", "Lake view", "Wifi", "Breakfast", "Power backup"],
  desert: ["Bonfire", "All meals", "Air conditioning", "Rooftop", "Free parking", "Breakfast"],
  heritage: ["Heritage", "Breakfast", "Air conditioning", "Wifi", "Rooftop", "Free parking"],
};
const FOOD = ["Kitchen", "Breakfast", "All meals"];

const STEPS = [
  { key: "place", label: "Your place", title: "What kind of place are you listing?",
    why: "This sets up the rest of the questions, so you only see what applies to your home." },
  { key: "where", label: "Location", title: "Where is it?",
    why: "Guests search by town and area. The state and PIN decide the GST on every stay; guests never see your PIN." },
  { key: "space", label: "Space", title: "Tell guests what's there",
    why: "Guests filter by these. Tick everything you really have." },
  { key: "photos", label: "Photos", title: "Show it off",
    why: "Guests decide from photos first. Daylight shots of every room, the view and the outside work best." },
  { key: "describe", label: "Describe", title: "Name it and tell its story",
    why: "A clear, specific title gets more taps than a generic one. We can draft the description for you." },
  { key: "price", label: "Price", title: "Set your price",
    why: "You can change it any time. See exactly what you receive before you decide." },
  { key: "rules", label: "Rules", title: "House rules and bookings",
    why: "Clear rules mean fewer surprises for you and your guests." },
  { key: "review", label: "Review", title: "Check and publish",
    why: "Look it over. You can edit anything after publishing too." },
] as const;
type StepKey = typeof STEPS[number]["key"];

const DRAFT_KEY = "aangan_new_listing_v1";

const EMPTY = {
  title: "", type: "", scene: "", city: "", area: "", state_code: "", pincode: "",
  description: "", price: "", cleaning: "500",
  guests: 2, bedrooms: 1, baths: 1,
  checkin: "14:00", checkout: "11:00",
  instant_book: true, policy: "flexible" as CancellationPolicy,
  veg_kitchen: false, jain_friendly: false,
  rules: EMPTY_HOUSE_RULES as HouseRulesValue,
  meals: EMPTY_MEAL_PLANS as MealPlansValue,
  reg_no: "",
  amenities: [] as string[],
};
type Form = typeof EMPTY;

type Eligibility = { eligible: boolean; missing: string[] };
type AiPrice = { low_inr: number; high_inr: number; suggested_price_inr: number; comparable_count: number; rationale: string };

export default function NewListingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [restored, setRestored] = useState(false);
  const [stepErr, setStepErr] = useState<string | null>(null);
  const [pending, setPending] = useState<null | "publish" | "draft">(null);
  const [preflight, setPreflight] = useState<Eligibility | null>(null);
  const [customAmenity, setCustomAmenity] = useState("");
  const loaded = useRef(false);
  const states = useStates();
  const stateName = (c: string) => states.find((s) => s.code === c)?.name || "";

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const typeCard = TYPE_CARDS.find((t) => t.value === form.type);
  const isRoom = !!typeCard?.room;
  const images = photos.filter((p) => p.remoteUrl).map((p) => p.remoteUrl!);
  const uploading = photos.some((p) => p.uploading);
  const price = parseInt(form.price) || 0;
  const cleaning = Math.max(parseInt(form.cleaning) || 0, 0);

  // ── Keep progress on this phone ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(DRAFT_KEY);
        const d = raw ? JSON.parse(raw) : null;
        if (d?.form && (d.form.type || d.form.city || d.form.title)) {
          const s = Math.min(Math.max(0, d.step | 0), STEPS.length - 1);
          setForm({ ...EMPTY, ...d.form });
          setPhotos((d.images || []).map((u: string) => ({ localUri: u, remoteUrl: u, uploading: false })));
          setStep(s); setReached(s); setRestored(true);
        }
      } catch { /* start fresh */ }
      loaded.current = true;
    })();
    api<Eligibility>("/api/listings/host/publish-eligibility").then(setPreflight).catch(() => setPreflight(null));
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    SecureStore.setItemAsync(DRAFT_KEY, JSON.stringify({ form, images, step })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, step, images.join("|")]);
  useEffect(() => { setStepErr(null); }, [form, photos]);
  const clearDraft = () => SecureStore.deleteItemAsync(DRAFT_KEY).catch(() => {});

  // ── Step rules ──────────────────────────────────────────────────────────────
  const [gstStatus, setGstStatus] = useState<GstStatus>("loading");
  // Answering the GST question clears its nudge — and only that: the question
  // remounts (loading → loaded) whenever step 2 opens, which must not wipe an
  // error the server just sent back there.
  const prevGst = useRef<GstStatus>("loading");
  useEffect(() => {
    if (prevGst.current === "unanswered" && gstStatus !== "unanswered" && gstStatus !== "loading") setStepErr(null);
    if (gstStatus !== "loading") prevGst.current = gstStatus;
  }, [gstStatus]);
  const gstHold = gstStatus === "liable" ? "Your listing can't go live yet because your turnover is over the GST limit: invoices must go out in your name, and we're setting that up. Save it as a draft and we'll contact you."
    : gstStatus === "composition" ? "Under the GST composition scheme you can't supply stays through a platform like ours. Opt out (form GST CMP-04), then change your answer on the location step. You can save a draft now."
    : null;
  // forDraft: a draft can be saved before the GST question is answered.
  const problem = (k: StepKey, forDraft = false): string | null => {
    switch (k) {
      case "place":
        if (!form.type) return "Choose what kind of place it is.";
        return form.scene ? null : "Choose its setting.";
      case "where":
        if (!form.city.trim()) return "Enter the town or city.";
        if (!form.area.trim()) return "Enter the area or neighbourhood.";
        if (!form.state_code) return "Choose the state.";
        if (!/^[1-9]\d{5}$/.test(form.pincode.trim())) return "Enter the 6-digit PIN code.";
        return !forDraft && gstStatus === "unanswered" ? "Answer the GST question about your turnover." : null;
      case "photos":
        return uploading ? "Wait for the photos to finish uploading." : null;
      case "describe":
        return form.title.trim().length < 4 ? "Give your place a title (at least 4 characters)." : null;
      case "price":
        return price > 0 ? mealPlansError(form.meals ?? EMPTY_MEAL_PLANS) : "Set a price per night.";
      case "rules":
        return isHHMM(form.checkin) && isHHMM(form.checkout) ? null : "Enter check-in and check-out as HH:MM, e.g. 14:00.";
      default: return null;
    }
  };
  const go = (to: number) => {
    setStepErr(null); setStep(to); setReached((r) => Math.max(r, to));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  const next = () => {
    const p = problem(STEPS[step].key);
    if (p) { setStepErr(p); return; }
    go(Math.min(step + 1, STEPS.length - 1));
  };

  const chooseType = (t: typeof TYPE_CARDS[number]) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setForm((f) => ({ ...f, type: t.value, scene: t.scene && !f.scene ? t.scene : f.scene, bedrooms: t.room ? 1 : f.bedrooms }));
  };
  const toggleAmen = (a: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setForm((f) => {
      const amenities = f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a];
      const food = amenities.some((x) => FOOD.includes(x));
      return { ...f, amenities, ...(food ? {} : { veg_kitchen: false, jain_friendly: false }) };
    });
  };
  const addCustom = () => {
    const v = customAmenity.trim();
    if (v && !form.amenities.includes(v)) set("amenities", [...form.amenities, v]);
    setCustomAmenity("");
  };

  // ── AI helpers ──────────────────────────────────────────────────────────────
  const [aiBusy, setAiBusy] = useState<null | "desc" | "price">(null);
  const [aiPrice, setAiPrice] = useState<AiPrice | null>(null);
  const writeDescription = async () => {
    setAiBusy("desc");
    try {
      const r = await api<{ description: string }>("/api/listings/ai/description", {
        method: "POST", body: {
          title: form.title, type: form.type, scene: form.scene, city: form.city, area: form.area,
          guests: form.guests, bedrooms: form.bedrooms, baths: form.baths, amenities: form.amenities, condition_notes: "",
        },
      });
      set("description", r.description);
    } catch (e: any) { Alert.alert("Couldn't write it", e.message || "Try again in a moment."); }
    finally { setAiBusy(null); }
  };
  const suggestPrice = async () => {
    setAiBusy("price");
    try {
      setAiPrice(await api<AiPrice>("/api/listings/ai/price-estimate", {
        method: "POST", body: {
          city: form.city, area: form.area, scene: form.scene, bedrooms: form.bedrooms, baths: form.baths,
          guests: form.guests, amenities: form.amenities, condition_notes: "",
        },
      }));
    } catch (e: any) { Alert.alert("Couldn't suggest a price", e.message || "Try again in a moment."); }
    finally { setAiBusy(null); }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const blocked = !!(preflight && !preflight.eligible) || !!gstHold;
  const draftable = !problem("place") && !problem("where", true) && !problem("describe") && !problem("price");
  const submit = async (published: boolean): Promise<boolean> => {
    for (let i = 0; i < STEPS.length - 1; i++) {
      const p = problem(STEPS[i].key, !published);
      if (p) { go(i); setTimeout(() => setStepErr(p), 0); return false; }
    }
    if (published && images.length === 0) {
      go(3); setTimeout(() => setStepErr("Add at least one photo to publish. You can save a draft without photos."), 0);
      return false;
    }
    setPending(published ? "publish" : "draft");
    try {
      await api<{ id: string }>("/api/listings", {
        method: "POST",
        body: {
          title: form.title.trim(), type: form.type, scene: form.scene,
          city: form.city.trim(), area: form.area.trim(), state_code: form.state_code, pincode: form.pincode.trim(),
          description: form.description.trim(), price_inr: price, cleaning_fee_inr: cleaning,
          guests: form.guests, bedrooms: isRoom ? 1 : form.bedrooms, baths: form.baths,
          amenities: form.amenities, veg_kitchen: form.veg_kitchen, jain_friendly: form.jain_friendly,
          cancellation_policy: form.policy, instant_book: form.instant_book,
          checkin_time: form.checkin.trim(), checkout_time: form.checkout.trim(),
          ...form.rules,
          meal_plans: mealPlansPayload(form.meals ?? EMPTY_MEAL_PLANS),
          registration_no: form.reg_no.trim() || null,
          images, published,
        },
      });
      clearDraft();
      Alert.alert(
        published ? "Listing published!" : "Draft saved",
        published ? "Your home is now live." : "Saved as a draft. Publish it any time from your dashboard.",
        [{ text: "View dashboard", onPress: () => router.replace("/host") }],
      );
      return true;
    } catch (e: any) {
      const missing = published ? verificationMissing(e) : null;
      if (missing) {
        Alert.alert("Verify to publish",
          `Before your listing can go live, ${describeMissing(missing)}. Save it as a draft now and publish it once you're verified.`,
          [{ text: "Cancel", style: "cancel" }, { text: "Save draft & verify", onPress: async () => { if (await submit(false)) router.replace("/host/verify"); } }]);
      } else if (e?.body?.detail?.reason === "location" || e?.body?.detail?.reason === "gst") {
        go(1); setTimeout(() => setStepErr(e.body.detail.message || e.message), 0);
      } else {
        Alert.alert("Couldn't save", e.message || "Please try again.");
      }
      return false;
    } finally { setPending(null); }
  };

  const strength = useMemo(() => {
    const checks = [
      !!form.type && !!form.scene, !problem("where"), form.amenities.length >= 5, images.length >= 5,
      form.title.trim().length >= 12, form.description.trim().length >= 120, price > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, images.length]);

  const S = STEPS[step];
  const last = step === STEPS.length - 1;
  const orderedAmen = [...(POPULAR[form.scene] || []), ...AMENITIES.map((a) => a.key).filter((k) => !(POPULAR[form.scene] || []).includes(k))];
  const iconOf = (k: string) => AMENITIES.find((a) => a.key === k)?.icon || "checkmark-circle-outline";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (step > 0 ? go(step - 1) : router.back())} style={styles.backBtn}
                          accessibilityLabel={step > 0 ? "Back" : "Close"}>
          <Ionicons name={step > 0 ? "chevron-back" : "close"} size={22} color={Colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} testID="new-listing-header" accessibilityLabel="List your property">
          {S.label} · {step + 1} of {STEPS.length}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS.length, now: step + 1 }}>
        {STEPS.map((s, i) => (
          <TouchableOpacity key={s.key} style={{ flex: 1, paddingVertical: 6 }} disabled={i > reached || i === step}
                            onPress={() => go(i)} accessibilityLabel={`Step ${i + 1}: ${s.label}`}>
            <View style={[styles.seg, i < step && { backgroundColor: Colors.terra },
                          i === step && { backgroundColor: Colors.terraDeep },
                          i > step && i <= reached && { backgroundColor: Colors.terraSoft }]} />
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {restored && step > 0 && (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>Welcome back. We kept what you'd filled in.</Text>
              <TouchableOpacity onPress={() => { clearDraft(); setForm(EMPTY); setPhotos([]); setRestored(false); setReached(0); go(0); }}>
                <Text style={styles.link}>Start over</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.title} testID="basic-info-section">{S.title}</Text>
          <Text style={styles.why}>{S.why}</Text>

          {/* 1. Place */}
          {S.key === "place" && (
            <View style={{ gap: 10 }}>
              {TYPE_CARDS.map((t) => (
                <Choice key={t.value} on={form.type === t.value} title={t.title} line={t.line} icon={t.icon} onPress={() => chooseType(t)} />
              ))}
              {!!form.type && (
                <>
                  <Text style={[styles.kicker, { marginTop: 18 }]}>WHAT'S THE SETTING?</Text>
                  <View style={styles.grid2}>
                    {SCENE_CARDS.map((s) => (
                      <View key={s.value} style={{ width: "48.5%" }}>
                        <Choice compact on={form.scene === s.value} title={s.title} line={s.line} onPress={() => set("scene", s.value)} />
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {/* 2. Where */}
          {S.key === "where" && (
            <View>
              <Field label="Town or city">
                <TextInput value={form.city} onChangeText={(v) => set("city", v)} placeholder="e.g. Manali" placeholderTextColor={Colors.charcoal3} style={styles.input} />
              </Field>
              <Field label="Area or neighbourhood">
                <TextInput value={form.area} onChangeText={(v) => set("area", v)} placeholder="e.g. Old Manali" placeholderTextColor={Colors.charcoal3} style={styles.input} />
              </Field>
              <StatePinFields stateCode={form.state_code} pincode={form.pincode}
                              onChange={(v) => setForm((f) => ({ ...f, ...v }))} inputStyle={styles.input} labelStyle={styles.fieldLabel} />
              <ListingGst stateCode={form.state_code} stateName={stateName(form.state_code)} inputStyle={styles.input} onStatus={setGstStatus} />
              <Text style={styles.helper}>Guests see the area and town. Your exact address is shared only after a booking is confirmed.</Text>
            </View>
          )}

          {/* 3. Space */}
          {S.key === "space" && (
            <View>
              <View style={styles.card}>
                <Stepper label="Guests" hint="The most people who can stay" value={form.guests} min={1} max={isRoom ? 6 : 40} onChange={(v) => set("guests", v)} />
                {!isRoom && <Stepper label="Bedrooms" value={form.bedrooms} min={1} max={30} onChange={(v) => set("bedrooms", v)} />}
                <Stepper label={isRoom ? "Bathrooms for guests" : "Bathrooms"} value={form.baths} min={1} max={30} onChange={(v) => set("baths", v)} last />
              </View>
              <Text style={[styles.kicker, { marginTop: 22 }]} testID="amenities-section">AMENITIES</Text>
              {!!form.scene && <Text style={styles.helperTop}>Popular for {SCENE_CARDS.find((s) => s.value === form.scene)?.title.toLowerCase()} stays first.</Text>}
              <View style={styles.amenGrid}>
                {[...orderedAmen, ...form.amenities.filter((a) => !AMENITIES.some((p) => p.key === a))].map((a) => {
                  const on = form.amenities.includes(a);
                  return (
                    <TouchableOpacity key={a} onPress={() => toggleAmen(a)} style={[styles.amenChip, on && styles.amenChipOn]}
                                      accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                      <Ionicons name={iconOf(a) as any} size={16} color={on ? Colors.terra : Colors.charcoal2} />
                      <Text style={[styles.amenText, on && { color: Colors.terra }]}>{a}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput value={customAmenity} onChangeText={setCustomAmenity} placeholder="Something else? e.g. Orchard"
                           placeholderTextColor={Colors.charcoal3} style={[styles.input, { flex: 1 }]} returnKeyType="done" onSubmitEditing={addCustom} />
                <TouchableOpacity style={[styles.addBtn, !customAmenity.trim() && { opacity: 0.4 }]} onPress={addCustom}
                                  disabled={!customAmenity.trim()} accessibilityLabel="Add amenity">
                  <Ionicons name="add" size={20} color={Colors.paper} />
                </TouchableOpacity>
              </View>
              {form.amenities.some((a) => FOOD.includes(a)) && (
                <View style={[styles.card, { padding: 16, marginTop: 20 }]}>
                  <Text style={styles.kicker}>ABOUT THE FOOD</Text>
                  <Text style={styles.helperTop}>Many guests search for these.</Text>
                  <Check on={form.veg_kitchen} onChange={(v) => set("veg_kitchen", v)} label="Vegetarian kitchen" line="Only vegetarian food is cooked here" />
                  <Check on={form.jain_friendly} onChange={(v) => set("jain_friendly", v)} label="Jain food on request" line="No onion, garlic or root vegetables when asked" />
                </View>
              )}
            </View>
          )}

          {/* 4. Photos */}
          {S.key === "photos" && (
            <View>
              <PhotoPicker value={photos} onChange={setPhotos} />
              <View style={{ marginTop: 14, gap: 4 }}>
                {["The first photo is your cover. Pick your best one.", "Shoot in daylight, lights on, curtains open.",
                  "Include every bedroom, the bathroom and the view."].map((t) => (
                  <Text key={t} style={styles.tip}>•  {t}</Text>
                ))}
              </View>
              <Text style={[styles.helper, { marginTop: 10 }]}>
                {images.length === 0 ? "You need at least one photo to publish. You can save a draft without them."
                  : images.length < 5 ? `${images.length} added. Aim for 5 or more.` : `${images.length} photos. Looking good.`}
              </Text>
            </View>
          )}

          {/* 5. Describe */}
          {S.key === "describe" && (
            <View>
              <Field label="Title">
                <TextInput value={form.title} onChangeText={(v) => set("title", v)} maxLength={80} placeholder={titleHint(form)}
                           placeholderTextColor={Colors.charcoal3} style={styles.input} />
                <Text style={styles.helper}>Say what's special: the view, the style, what's nearby. {form.title.length}/80</Text>
              </Field>
              <Field label="Description">
                <TextInput value={form.description} onChangeText={(v) => set("description", v)} multiline textAlignVertical="top"
                           placeholder="What makes your home special, what's close by, and anything guests should know."
                           placeholderTextColor={Colors.charcoal3} style={[styles.input, { height: 150, paddingTop: 12 }]} />
              </Field>
              <Button variant="outline" title={aiBusy === "desc" ? "Writing…" : form.description ? "Rewrite with AI" : "Write it for me with AI"}
                      onPress={writeDescription} loading={aiBusy === "desc"} />
              <Text style={styles.helper}>Uses what you told us so far. Edit it to sound like you.</Text>
            </View>
          )}

          {/* 6. Price */}
          {S.key === "price" && (
            <View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Field label="Price per night (₹)" style={{ flex: 1 }}>
                  <TextInput value={form.price} onChangeText={(v) => set("price", v.replace(/\D/g, ""))} keyboardType="number-pad"
                             placeholder="e.g. 4000" placeholderTextColor={Colors.charcoal3} style={styles.input} />
                </Field>
                <Field label="Cleaning fee (₹)" style={{ flex: 1 }}>
                  <TextInput value={form.cleaning} onChangeText={(v) => set("cleaning", v.replace(/\D/g, ""))} keyboardType="number-pad"
                             style={styles.input} />
                </Field>
              </View>
              <View style={[styles.card, { padding: 14, marginBottom: 14 }]}>
                {aiPrice ? (
                  <>
                    <Text style={styles.body2}>
                      Similar stays: <Text style={styles.bold}>{inr(aiPrice.low_inr)}–{inr(aiPrice.high_inr)}</Text>. We suggest{" "}
                      <Text style={styles.bold}>{inr(aiPrice.suggested_price_inr)}</Text>
                      {aiPrice.comparable_count > 0 ? ` (from ${aiPrice.comparable_count} nearby listings)` : ""}. {aiPrice.rationale}
                    </Text>
                    <Button variant="outline" size="sm" title={`Use ${inr(aiPrice.suggested_price_inr)}`} style={{ marginTop: 10 }}
                            onPress={() => set("price", String(aiPrice.suggested_price_inr))} />
                  </>
                ) : (
                  <>
                    <Button variant="outline" title={aiBusy === "price" ? "Looking at nearby stays…" : "Suggest a price"}
                            onPress={suggestPrice} loading={aiBusy === "price"} />
                    <Text style={styles.helper}>Based on similar homes near {form.city || "you"}.</Text>
                  </>
                )}
              </View>
              {price > 0 && (
                <Text style={[styles.helper, { marginBottom: 12 }]}>
                  {gstNote(price, cleaning)}
                  {" "}We collect and pay it; it doesn't come out of your earnings.
                </Text>
              )}
              <PayoutPreview price={price} cleaning={cleaning} />
              <Field label="Meal plans (optional)">
                <MealPlansEditor value={form.meals ?? EMPTY_MEAL_PLANS} onChange={(v) => set("meals", v)} />
              </Field>
            </View>
          )}

          {/* 7. Rules */}
          {S.key === "rules" && (
            <View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Field label="Check-in from (24h)" style={{ flex: 1 }}>
                  <TextInput value={form.checkin} onChangeText={(v) => set("checkin", v)} keyboardType="numbers-and-punctuation" maxLength={5}
                             placeholder="14:00" placeholderTextColor={Colors.charcoal3} style={[styles.input, !isHHMM(form.checkin) && { borderColor: Colors.terra }]} />
                </Field>
                <Field label="Check-out by (24h)" style={{ flex: 1 }}>
                  <TextInput value={form.checkout} onChangeText={(v) => set("checkout", v)} keyboardType="numbers-and-punctuation" maxLength={5}
                             placeholder="11:00" placeholderTextColor={Colors.charcoal3} style={[styles.input, !isHHMM(form.checkout) && { borderColor: Colors.terra }]} />
                </Field>
              </View>
              <Text style={[styles.helper, { marginTop: -6, marginBottom: 18 }]}>
                Guests see these before they book ({fmtTime(form.checkin, "—")} / {fmtTime(form.checkout, "—")}).
              </Text>
              <Text style={styles.kicker}>HOW GUESTS BOOK</Text>
              <BookingModeChoice value={form.instant_book} onChange={(v) => set("instant_book", v)} />
              <Text style={[styles.kicker, { marginTop: 22 }]}>IF A GUEST CANCELS</Text>
              <CancellationChoice value={form.policy} onChange={(v) => set("policy", v)} />
              <Text style={[styles.kicker, { marginTop: 22 }]}>HOUSE RULES</Text>
              <HouseRulesEditor value={form.rules} onChange={(v) => set("rules", v)} />
              {!!form.state_code && (
                <Field label={`${stateName(form.state_code) || "State"} tourism registration (optional)`} style={{ marginTop: 18 }}>
                  <TextInput value={form.reg_no} onChangeText={(v) => set("reg_no", v)} maxLength={60} autoCapitalize="characters"
                             placeholder="As printed on your certificate" placeholderTextColor={Colors.charcoal3} style={styles.input} />
                  <Text style={styles.helper}>Once we've checked it, your listing shows a "State-registered" badge.</Text>
                </Field>
              )}
            </View>
          )}

          {/* 8. Review */}
          {S.key === "review" && (
            <View style={{ gap: 10 }}>
              {!!gstHold && (
                <View style={styles.gate}>
                  <Text style={styles.gateTitle}>Save it now; it goes live once GST is sorted</Text>
                  <Text style={styles.body2}>{gstHold}</Text>
                  <TouchableOpacity onPress={() => go(1)} style={{ marginTop: 8 }}>
                    <Text style={styles.link}>Review the GST answer</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!!(preflight && !preflight.eligible) && (
                <View style={styles.gate}>
                  <Text style={styles.gateTitle}>Save it now, publish after verifying</Text>
                  <Text style={styles.body2}>To keep guests safe, every host verifies a few details first. Still to do: {describeMissing(preflight!.missing)}.</Text>
                  <TouchableOpacity onPress={async () => { if (await submit(false)) router.replace("/host/verify"); }} style={{ marginTop: 8 }}>
                    <Text style={styles.link}>Save draft and verify now</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Summary label="YOUR PLACE" onEdit={() => go(0)} value={`${typeCard?.title || form.type} · ${SCENE_CARDS.find((s) => s.value === form.scene)?.title || ""}`} />
              <Summary label="LOCATION" onEdit={() => go(1)} value={`${form.area}, ${form.city}, ${stateName(form.state_code)} ${form.pincode}`} />
              <Summary label="SPACE" onEdit={() => go(2)}
                       value={`${form.guests} guests${isRoom ? "" : ` · ${form.bedrooms} bedroom${form.bedrooms === 1 ? "" : "s"}`} · ${form.baths} bath${form.baths === 1 ? "" : "s"} · ${form.amenities.length} amenities`} />
              <Summary label="PHOTOS" onEdit={() => go(3)} warn={images.length === 0}
                       value={images.length ? `${images.length} photo${images.length === 1 ? "" : "s"}` : "None yet (needed to publish)"} />
              <Summary label="TITLE" onEdit={() => go(4)} value={form.title} />
              <Summary label="PRICE" onEdit={() => go(5)} value={`${inr(price)} a night + ${inr(cleaning)} cleaning · ${mealPlansSummary(form.meals ?? EMPTY_MEAL_PLANS)}`} />
              <Summary label="BOOKINGS" onEdit={() => go(6)}
                       value={`${form.instant_book ? "Instant booking" : "You approve each request"} · ${form.policy === "non_refundable" ? "non-refundable" : "refundable"}`} />
              <Text style={[styles.helper, { textAlign: "center" }]}>Listing strength {strength}%</Text>
            </View>
          )}

          {!!stepErr && <Text style={styles.err} accessibilityRole="alert">{stepErr}</Text>}
          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {draftable && !(last && blocked) ? (
            <TouchableOpacity onPress={() => submit(false)} disabled={!!pending || uploading} style={styles.draftBtn}>
              <Text style={styles.draftText}>{pending === "draft" ? "Saving…" : "Save draft"}</Text>
            </TouchableOpacity>
          ) : <View style={{ flex: 1 }} />}
          {last ? (
            <Button title={blocked ? (pending === "draft" ? "Saving…" : "Save draft") : pending === "publish" ? "Publishing…" : uploading ? "Uploading photos…" : "Publish listing"}
                    onPress={() => submit(!blocked)} disabled={!!pending || uploading} loading={!!pending} size="lg" style={{ flex: 1.4 }} />
          ) : (
            <Button title={step === STEPS.length - 2 ? "Review" : "Next"} onPress={next} size="lg" style={{ flex: 1.4 }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function titleHint(f: Form): string {
  const t = TYPE_CARDS.find((x) => x.value === f.type)?.title.toLowerCase() || "home";
  const view = f.amenities.find((a) => a.endsWith("view"));
  return `e.g. ${view || "Quiet"} ${t} in ${f.area || f.city || "the hills"}`;
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Choice({ on, title, line, icon, onPress, compact }: { on: boolean; title: string; line: string; icon?: string; onPress: () => void; compact?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }}
                      style={[styles.choice, compact && { padding: 12 }, on && styles.choiceOn]}>
      {!!icon && <Ionicons name={icon as any} size={22} color={on ? Colors.terra : Colors.charcoal2} />}
      <View style={{ flex: 1 }}>
        <Text style={[styles.choiceTitle, compact && { fontSize: 14 }]}>{title}</Text>
        <Text style={[styles.choiceLine, compact && { fontSize: 11.5 }]}>{line}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Stepper({ label, hint, value, min, max, onChange, last }: { label: string; hint?: string; value: number; min: number; max: number; onChange: (v: number) => void; last?: boolean }) {
  return (
    <View style={[styles.stepRow, !last && { borderBottomWidth: 1, borderBottomColor: Colors.edge }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepLabel}>{label}</Text>
        {!!hint && <Text style={styles.helperTop}>{hint}</Text>}
      </View>
      <TouchableOpacity style={[styles.stepBtn, value <= min && { opacity: 0.3 }]} disabled={value <= min}
                        onPress={() => onChange(value - 1)} accessibilityLabel={`Fewer ${label.toLowerCase()}`}>
        <Ionicons name="remove" size={18} color={Colors.charcoal} />
      </TouchableOpacity>
      <Text style={styles.stepVal}>{value}</Text>
      <TouchableOpacity style={[styles.stepBtn, value >= max && { opacity: 0.3 }]} disabled={value >= max}
                        onPress={() => onChange(value + 1)} accessibilityLabel={`More ${label.toLowerCase()}`}>
        <Ionicons name="add" size={18} color={Colors.charcoal} />
      </TouchableOpacity>
    </View>
  );
}

function Check({ on, onChange, label, line }: { on: boolean; onChange: (v: boolean) => void; label: string; line: string }) {
  return (
    <TouchableOpacity onPress={() => onChange(!on)} style={styles.checkRow} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
      <Ionicons name={on ? "checkbox" : "square-outline"} size={22} color={on ? Colors.terra : Colors.charcoal3} />
      <View style={{ flex: 1 }}>
        <Text style={styles.stepLabel}>{label}</Text>
        <Text style={styles.helperTop}>{line}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Summary({ label, value, onEdit, warn }: { label: string; value: string; onEdit: () => void; warn?: boolean }) {
  return (
    <View style={styles.summary}>
      <View style={{ flex: 1 }}>
        <Text style={styles.kicker}>{label}</Text>
        <Text style={[styles.summaryVal, warn && { color: Colors.terra }]}>{value}</Text>
      </View>
      <TouchableOpacity onPress={onEdit} hitSlop={8}><Text style={styles.link}>Edit</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 6, backgroundColor: Colors.cream },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 13, fontWeight: "800", color: Colors.charcoal2, letterSpacing: 0.3 },
  progress: { flexDirection: "row", gap: 4, paddingHorizontal: 16, paddingBottom: 4 },
  seg: { height: 5, borderRadius: 3, backgroundColor: Colors.edge },
  body: { padding: 16, paddingTop: 12 },
  banner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderWidth: 1, borderColor: Colors.edge,
            backgroundColor: Colors.paper, borderRadius: Radius.md, padding: 12, marginBottom: 14 },
  bannerText: { flex: 1, fontSize: 13, color: Colors.charcoal2 },
  title: { fontFamily: "Fraunces", fontSize: 28, lineHeight: 33, color: Colors.charcoal, letterSpacing: -0.4 },
  why: { fontSize: 14, lineHeight: 20, color: Colors.charcoal2, marginTop: 6, marginBottom: 20 },
  kicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4, color: Colors.charcoal3, marginBottom: 8 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: Colors.charcoal2, marginBottom: 6 },
  input: { height: 48, paddingHorizontal: 14, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.edge,
           backgroundColor: Colors.paper, fontSize: 15, color: Colors.charcoal, fontWeight: "600" },
  helper: { fontSize: 12, lineHeight: 17, color: Colors.charcoal3, marginTop: 6 },
  helperTop: { fontSize: 12, lineHeight: 17, color: Colors.charcoal3, marginBottom: 8 },
  tip: { fontSize: 13, color: Colors.charcoal2, lineHeight: 19 },
  body2: { fontSize: 13.5, lineHeight: 20, color: Colors.charcoal2 },
  bold: { fontWeight: "800", color: Colors.charcoal },
  link: { fontSize: 13.5, fontWeight: "800", color: Colors.terraDeep, textDecorationLine: "underline" },
  err: { marginTop: 18, fontSize: 13.5, fontWeight: "700", color: Colors.error },
  grid2: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  choice: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: Radius.lg, borderWidth: 1.5,
            borderColor: Colors.edge, backgroundColor: Colors.paper },
  choiceOn: { borderColor: Colors.terra, backgroundColor: Colors.terraTint },
  choiceTitle: { fontSize: 15.5, fontWeight: "800", color: Colors.charcoal },
  choiceLine: { fontSize: 12.5, color: Colors.charcoal2, marginTop: 2 },
  card: { borderWidth: 1, borderColor: Colors.edge, borderRadius: Radius.lg, backgroundColor: Colors.paper },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  stepLabel: { fontSize: 15, fontWeight: "700", color: Colors.charcoal },
  stepBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: Colors.edgeStrong, alignItems: "center", justifyContent: "center" },
  stepVal: { width: 26, textAlign: "center", fontSize: 16, fontWeight: "800", color: Colors.charcoal, fontVariant: ["tabular-nums"] },
  amenGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  amenChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: Radius.full,
              borderWidth: 1.5, borderColor: Colors.edge, backgroundColor: Colors.paper },
  amenChipOn: { borderColor: Colors.terra, backgroundColor: Colors.warmBg },
  amenText: { fontSize: 12.5, fontWeight: "700", color: Colors.charcoal2 },
  addBtn: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.terra, alignItems: "center", justifyContent: "center" },
  checkRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 6 },
  gate: { borderWidth: 1.5, borderColor: Colors.terraSoft, backgroundColor: Colors.terraTint, borderRadius: Radius.lg, padding: 14, marginBottom: 4 },
  gateTitle: { fontSize: 16, fontWeight: "800", color: Colors.terraDeep, marginBottom: 6 },
  summary: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderWidth: 1, borderColor: Colors.edge, borderRadius: Radius.md,
             backgroundColor: Colors.paper, padding: 12 },
  summaryVal: { fontSize: 14, color: Colors.charcoal, marginTop: 2 },
  footer: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10,
            borderTopWidth: 1, borderTopColor: Colors.edge, backgroundColor: Colors.paper },
  draftBtn: { flex: 1, height: 52, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.edge, alignItems: "center", justifyContent: "center" },
  draftText: { fontSize: 15, fontWeight: "700", color: Colors.charcoal },
});
