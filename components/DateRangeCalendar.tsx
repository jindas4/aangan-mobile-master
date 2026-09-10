import { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Fonts, Radius } from "@/constants/Colors";
import { CalendarRange } from "@/lib/api";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function toKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function parseKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m: m - 1, d };
}
function todayKey() {
  const t = new Date();
  return toKey(t.getFullYear(), t.getMonth(), t.getDate());
}
function nextDayKey(key: string): string {
  const { y, m, d } = parseKey(key);
  const dt = new Date(y, m, d + 1);
  return toKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

export interface DateRangeValue {
  checkIn: string;
  checkOut: string;
}

interface Props {
  minDate?: string;
  unavailable: CalendarRange[];
  minNights: number;
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
}

export function DateRangeCalendar({ minDate, unavailable, minNights, value, onChange }: Props) {
  const min = minDate || todayKey();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const isBlocked = (key: string) =>
    unavailable.some((r) => key >= r.start_date && key < r.end_date);
  const isPast = (key: string) => key < min;

  const canGoPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth();
  const goPrev = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const cells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [viewYear, viewMonth]);

  const onDayPress = (day: number) => {
    const key = toKey(viewYear, viewMonth, day);
    if (isPast(key) || isBlocked(key)) return;

    const { checkIn, checkOut } = value;
    if (!checkIn || checkOut) {
      onChange({ checkIn: key, checkOut: "" });
      return;
    }
    if (key <= checkIn) {
      onChange({ checkIn: key, checkOut: "" });
      return;
    }
    let crossesBlocked = false;
    let cursor = checkIn;
    while (cursor < key) {
      if (isBlocked(cursor)) {
        crossesBlocked = true;
        break;
      }
      cursor = nextDayKey(cursor);
    }
    if (crossesBlocked) {
      onChange({ checkIn: key, checkOut: "" });
      return;
    }
    onChange({ checkIn, checkOut: key });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goPrev}
          disabled={!canGoPrev}
          style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
        >
          <Ionicons name="chevron-back" size={18} color={canGoPrev ? Colors.charcoal : Colors.charcoal3} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={goNext} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={18} color={Colors.charcoal} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekLabel}>{w}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={styles.cell} />;
          const key = toKey(viewYear, viewMonth, day);
          const disabled = isPast(key) || isBlocked(key);
          const isStart = key === value.checkIn;
          const isEnd = key === value.checkOut;
          const inRange =
            !!value.checkIn && !!value.checkOut && key > value.checkIn && key < value.checkOut;

          return (
            <TouchableOpacity
              key={i}
              style={[styles.cell, inRange && styles.cellInRange]}
              onPress={() => onDayPress(day)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <View style={[styles.dayCircle, (isStart || isEnd) && styles.dayCircleSelected]}>
                <Text
                  style={[
                    styles.dayText,
                    disabled && styles.dayTextDisabled,
                    (isStart || isEnd) && styles.dayTextSelected,
                  ]}
                >
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {minNights > 1 && (
        <Text style={styles.hint}>Host requires a minimum {minNights}-night stay.</Text>
      )}
    </View>
  );
}

const CELL = 40;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.warmBg,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  monthLabel: {
    fontFamily: Fonts.display,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekLabel: {
    width: CELL,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: Colors.charcoal3,
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: "center",
    justifyContent: "center",
  },
  cellInRange: {
    backgroundColor: Colors.terraSoft,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: {
    backgroundColor: Colors.terra,
  },
  dayText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  dayTextDisabled: {
    color: Colors.charcoal3,
    textDecorationLine: "line-through",
  },
  dayTextSelected: {
    color: Colors.paper,
    fontWeight: "700",
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.charcoal2,
    textAlign: "center",
  },
});
