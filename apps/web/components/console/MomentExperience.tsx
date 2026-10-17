"use client";

import { Button } from "@krizaka/ui/button";
import { useEffect, useId, useState } from "react";

import { useSay } from "@/lib/i18n-client";

import { AnimatedPortrait } from "./AnimatedPortrait";

function cls(...parts: (string | boolean | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

type PresenceId = "lea" | "samuel" | "noor";
type MomentPhase = "prep" | "active" | "conclusion";

interface ThoughtItem {
  id: string;
  sender: "user" | "presence";
  text: string;
}

export function MomentExperience() {
  const { say } = useSay();
  const inputId = useId();

  const [phase, setPhase] = useState<MomentPhase>("prep");
  const [presence, setPresence] = useState<PresenceId>("lea");
  const [stateBefore, setStateBefore] = useState<number>(3);
  const [stateAfter, setStateAfter] = useState<number>(4);

  // Bounded timer: 25 minutes = 1500 seconds
  const [remainingSeconds, setRemainingSeconds] = useState<number>(1500);
  const [speaking, setSpeaking] = useState<boolean>(false);
  const [currentInput, setCurrentInput] = useState<string>("");
  const [exchangeList, setExchangeList] = useState<ThoughtItem[]>([]);

  // Kept takeaway fields
  const [keptTheme, setKeptTheme] = useState<string>("");
  const [keptInsight, setKeptInsight] = useState<string>("");
  const [keptSmallStep, setKeptSmallStep] = useState<string>("");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Timer countdown
  useEffect(() => {
    if (phase !== "active") return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setPhase("conclusion");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [phase]);

  const presenceNames: Record<PresenceId, string> = {
    lea: say("dashboard.moment.leaName"),
    samuel: say("dashboard.moment.samuelName"),
    noor: say("dashboard.moment.noorName"),
  };

  const presenceStyles: Record<PresenceId, string> = {
    lea: say("dashboard.moment.leaStyle"),
    samuel: say("dashboard.moment.samuelStyle"),
    noor: say("dashboard.moment.noorStyle"),
  };

  const currentPresenceName = presenceNames[presence];

  function handleStart() {
    setRemainingSeconds(1500);
    setExchangeList([]);
    setSpeaking(false);
    setPhase("active");
  }

  function handleDeposit() {
    const text = currentInput.trim();
    if (!text) return;

    const userItem: ThoughtItem = {
      id: String(Date.now()),
      sender: "user",
      text,
    };

    setExchangeList((prev) => [...prev, userItem]);
    setCurrentInput("");
    setSpeaking(true);

    if (!keptTheme) {
      setKeptTheme(text.slice(0, 60));
    }

    window.setTimeout(() => {
      const reflectiveTemplates: Record<PresenceId, string[]> = {
        lea: [
          say("dashboard.moment.sampleLea1"),
          say("dashboard.moment.sampleLea2"),
        ],
        samuel: [
          say("dashboard.moment.sampleSamuel1"),
          say("dashboard.moment.sampleSamuel2"),
        ],
        noor: [
          say("dashboard.moment.sampleNoor1"),
          say("dashboard.moment.sampleNoor2"),
        ],
      };

      const options = reflectiveTemplates[presence];
      const replyText = options[Math.floor(Math.random() * options.length)];

      const presenceItem: ThoughtItem = {
        id: String(Date.now() + 1),
        sender: "presence",
        text: replyText,
      };

      setExchangeList((prev) => [...prev, presenceItem]);
      setSpeaking(false);
    }, 1500);
  }

  function handleFinishMoment() {
    // Purge verbatim exchanges for privacy
    setExchangeList([]);
    setSpeaking(false);
    if (!keptInsight) {
      setKeptInsight(currentPresenceName + " — " + presenceStyles[presence]);
    }
    if (!keptSmallStep) {
      setKeptSmallStep("Faire une pause calme avant la suite de la journée.");
    }
    setPhase("conclusion");
  }

  function handleReset() {
    setPhase("prep");
    setExchangeList([]);
    setCurrentInput("");
    setSavedSuccess(false);
  }

  const minutesLeft = Math.ceil(remainingSeconds / 60);

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border-default bg-surface-1 p-5 shadow-sm">
      {/* State 1: Preparation */}
      {phase === "prep" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-xl font-bold text-fg">
              {say("dashboard.moment.title")}
            </h3>
            <p className="text-sm font-medium text-fg-accent">
              {say("dashboard.moment.subtitle")}
            </p>
            <p className="mt-1 text-sm text-fg-secondary">
              {say("dashboard.moment.description")}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-fg">
              {say("dashboard.moment.choosePresence")}
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(["lea", "samuel", "noor"] as PresenceId[]).map((p) => {
                const isSelected = presence === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPresence(p)}
                    className={cls(
                      "flex flex-col items-start rounded-lg border p-3.5 text-left transition-all",
                      isSelected
                        ? "border-accent bg-surface-2 ring-1 ring-accent"
                        : "border-border-default bg-surface-1 hover:border-fg-secondary",
                    )}
                  >
                    <span className="font-display text-base font-semibold text-fg">
                      {presenceNames[p]}
                    </span>
                    <span className="mt-1 text-xs text-fg-secondary">
                      {presenceStyles[p]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-fg">
              {say("dashboard.moment.moodPrompt")}
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              {[1, 2, 3, 4, 5].map((rate) => {
                const label = say(`dashboard.moment.mood${rate}`);
                const isSelected = stateBefore === rate;
                return (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setStateBefore(rate)}
                    className={cls(
                      "rounded-lg border px-3 py-2 text-center text-xs font-medium transition-all",
                      isSelected
                        ? "border-accent bg-accent text-on-accent shadow-sm"
                        : "border-border-default bg-surface-1 text-fg hover:border-fg-secondary",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              type="button"
              variant="primary"
              shape="cut"
              size="lg"
              onClick={handleStart}
            >
              {say("dashboard.moment.startMoment")}
            </Button>
          </div>
        </div>
      )}

      {/* State 2: Active Moment */}
      {phase === "active" && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default pb-3">
            <div className="flex flex-col">
              <h3 className="font-display text-lg font-bold text-fg">
                {say("dashboard.moment.activeMoment", {
                  presence: currentPresenceName,
                })}
              </h3>
              <span className="text-xs font-semibold text-fg-accent">
                {say("dashboard.moment.timerLeft", { minutes: minutesLeft })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="tel:988"
                className="rounded-md border border-border-default bg-surface-2 px-2.5 py-1 text-xs font-medium text-fg-secondary hover:text-fg"
              >
                {say("dashboard.moment.pauseCrisis")}
              </a>
              <Button
                type="button"
                variant="secondary"
                shape="cut"
                size="sm"
                onClick={handleFinishMoment}
              >
                {say("dashboard.moment.endMoment")}
              </Button>
            </div>
          </div>

          {remainingSeconds <= 120 && (
            <div className="rounded-lg border border-accent bg-surface-2 p-3 text-sm text-fg-accent">
              <p className="font-medium">{say("dashboard.moment.noticeTwoMin")}</p>
            </div>
          )}

          <div className="flex flex-col items-center">
            <AnimatedPortrait
              presenceId={presence}
              speaking={speaking}
              aiBadgeLabel={say("dashboard.moment.aiBadge")}
            />
            <p className="mt-2 text-center text-xs text-fg-secondary">
              {speaking
                ? say("dashboard.moment.speakingState", {
                    presence: currentPresenceName,
                  })
                : say("dashboard.moment.listeningState")}
            </p>
          </div>

          <div className="flex max-h-56 flex-col gap-2.5 overflow-y-auto rounded-lg border border-border-default bg-surface-0 p-3">
            {exchangeList.map((item) => (
              <div
                key={item.id}
                className={cls(
                  "flex flex-col rounded-md p-2 text-xs leading-relaxed",
                  item.sender === "user"
                    ? "self-end bg-surface-2 text-fg"
                    : "self-start border border-border-default bg-surface-1 text-fg",
                )}
              >
                <span className="text-[10px] font-semibold text-fg-muted">
                  {item.sender === "user" ? say("dashboard.moment.userLabel") : currentPresenceName}
                </span>
                <span className="mt-0.5">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <label htmlFor={inputId} className="sr-only">
              {say("dashboard.moment.speechInputPlaceholder")}
            </label>
            <input
              id={inputId}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleDeposit();
                }
              }}
              placeholder={say("dashboard.moment.speechInputPlaceholder")}
              className="flex-1 rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <Button
              type="button"
              variant="primary"
              shape="cut"
              size="sm"
              disabled={!currentInput.trim() || speaking}
              onClick={handleDeposit}
            >
              {say("dashboard.moment.speakBtn")}
            </Button>
          </div>
        </div>
      )}

      {/* State 3: Conclusion & What I keep */}
      {phase === "conclusion" && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1 border-b border-border-default pb-3">
            <h3 className="font-display text-xl font-bold text-fg">
              {say("dashboard.moment.keptTitle")}
            </h3>
            <p className="text-sm text-fg-secondary">
              {say("dashboard.moment.keptDescription")}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-fg">
                {say("dashboard.moment.keptThemes")}
              </label>
              <input
                type="text"
                value={keptTheme}
                onChange={(e) => setKeptTheme(e.target.value)}
                className="rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-fg">
                {say("dashboard.moment.keptInsights")}
              </label>
              <input
                type="text"
                value={keptInsight}
                onChange={(e) => setKeptInsight(e.target.value)}
                className="rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-fg">
                {say("dashboard.moment.keptStep")}
              </label>
              <input
                type="text"
                value={keptSmallStep}
                onChange={(e) => setKeptSmallStep(e.target.value)}
                className="rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <h4 className="text-xs font-semibold text-fg">
              {say("dashboard.moment.moodPrompt")}
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              {[1, 2, 3, 4, 5].map((rate) => {
                const label = say(`dashboard.moment.mood${rate}`);
                const isSelected = stateAfter === rate;
                return (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setStateAfter(rate)}
                    className={cls(
                      "rounded-lg border px-3 py-1.5 text-center text-xs font-medium transition-all",
                      isSelected
                        ? "border-accent bg-accent text-on-accent"
                        : "border-border-default bg-surface-1 text-fg hover:border-fg-secondary",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {savedSuccess && (
            <p className="text-xs font-medium text-fg-accent">
              {say("account.profile.saved")}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default pt-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                shape="cut"
                size="sm"
                onClick={() => setSavedSuccess(true)}
              >
                {say("dashboard.moment.saveToNotebook")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                shape="cut"
                size="sm"
                onClick={() => window.print()}
              >
                {say("dashboard.moment.exportOnePage")}
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              {say("dashboard.moment.closeMoment")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
