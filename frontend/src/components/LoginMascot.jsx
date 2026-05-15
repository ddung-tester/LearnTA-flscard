import { useEffect, useRef } from "react";
import {
  Alignment,
  Fit,
  Layout,
  useRive,
  useStateMachineInput,
} from "@rive-app/react-canvas";

const STATE_MACHINE_NAME = "Login Machine";
const RIVE_SRC = "/animation/login.riv";
const MAX_LOOK_VALUE = 100;
const POINTER_LOOK_EASING = 0.28;

function clampLookValue(value) {
  return Math.min(Math.max(Number(value) || 0, 0), MAX_LOOK_VALUE);
}

function getPointerLookValue(event) {
  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth || 1;

  return clampLookValue((event.clientX / viewportWidth) * MAX_LOOK_VALUE);
}

function isInPointerTrackingZone(event) {
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight || 1;

  return event.clientY >= viewportHeight / 2;
}

function fireTrigger(input) {
  if (input && typeof input.fire === "function") {
    input.fire();
  }
}

function setRiveInputValue(input, value) {
  if (input) {
    input.value = value;
  }
}

function layInputUuTien(...inputs) {
  return inputs.find(Boolean) || null;
}

function LoginMascot({
  isPasswordFocused = false,
  isChecking = false,
  lookValue = 0,
  triggerSuccess = 0,
  triggerFail = 0,
}) {
  const lastSuccessRef = useRef(triggerSuccess);
  const lastFailRef = useRef(triggerFail);
  const pendingSuccessRef = useRef(false);
  const pendingFailRef = useRef(false);
  const currentLookRef = useRef(clampLookValue(lookValue));
  const lookAnimationRef = useRef(null);
  const pointerLookAnimationRef = useRef(null);
  const pointerLookTargetRef = useRef(clampLookValue(lookValue));
  const { rive, RiveComponent } = useRive({
    src: RIVE_SRC,
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
  });
  const checkingInput = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    "isChecking"
  );
  const checkingInputLegacy = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    "dang kiem tra"
  );
  const lookInput = useStateMachineInput(rive, STATE_MACHINE_NAME, "numLook");
  const lookInputCamel = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    "numLock"
  );
  const lookInputLower = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    "numlock"
  );
  const handsUpInput = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    "isHandsUp"
  );
  const handsUpInputLegacy = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    "gio tay len"
  );
  const successInput = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    "trigSuccess"
  );
  const failInput = useStateMachineInput(rive, STATE_MACHINE_NAME, "trigFail");

  useEffect(() => {
    setRiveInputValue(
      layInputUuTien(handsUpInput, handsUpInputLegacy),
      isPasswordFocused
    );
  }, [handsUpInput, handsUpInputLegacy, isPasswordFocused]);

  useEffect(() => {
    setRiveInputValue(
      layInputUuTien(checkingInput, checkingInputLegacy),
      isPasswordFocused ? false : isChecking
    );
  }, [checkingInput, checkingInputLegacy, isChecking, isPasswordFocused]);

  useEffect(() => {
    const activeLookInput = layInputUuTien(
      lookInput,
      lookInputCamel,
      lookInputLower
    );

    if (!activeLookInput) {
      return undefined;
    }

    const startValue = currentLookRef.current;
    const targetValue = clampLookValue(lookValue);
    const startTime = performance.now();
    const duration = 180;

    if (lookAnimationRef.current) {
      cancelAnimationFrame(lookAnimationRef.current);
    }

    function updateLookValue(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 4);
      const nextValue =
        startValue + (targetValue - startValue) * easedProgress;

      currentLookRef.current = nextValue;
      setRiveInputValue(activeLookInput, nextValue);

      if (progress < 1) {
        lookAnimationRef.current = requestAnimationFrame(updateLookValue);
      }
    }

    lookAnimationRef.current = requestAnimationFrame(updateLookValue);

    return () => {
      if (lookAnimationRef.current) {
        cancelAnimationFrame(lookAnimationRef.current);
      }
    };
  }, [lookInput, lookInputCamel, lookInputLower, lookValue]);

  useEffect(() => {
    const activeLookInput = layInputUuTien(
      lookInput,
      lookInputCamel,
      lookInputLower
    );

    if (!activeLookInput) {
      return undefined;
    }

    function animatePointerLook() {
      const currentValue = currentLookRef.current;
      const targetValue = pointerLookTargetRef.current;
      const nextValue =
        currentValue + (targetValue - currentValue) * POINTER_LOOK_EASING;

      currentLookRef.current = nextValue;
      setRiveInputValue(activeLookInput, nextValue);

      if (Math.abs(targetValue - nextValue) > 0.1) {
        pointerLookAnimationRef.current =
          requestAnimationFrame(animatePointerLook);
      } else {
        currentLookRef.current = targetValue;
        setRiveInputValue(activeLookInput, targetValue);
        pointerLookAnimationRef.current = null;
      }
    }

    function handlePointerMove(event) {
      const activeCheckingInput = layInputUuTien(
        checkingInput,
        checkingInputLegacy
      );
      const shouldTrackPointer =
        !isPasswordFocused && isInPointerTrackingZone(event);

      pointerLookTargetRef.current = shouldTrackPointer
        ? getPointerLookValue(event)
        : clampLookValue(lookValue);

      if (!isPasswordFocused) {
        setRiveInputValue(activeCheckingInput, shouldTrackPointer || isChecking);
      }

      if (lookAnimationRef.current) {
        cancelAnimationFrame(lookAnimationRef.current);
      }

      if (!pointerLookAnimationRef.current) {
        pointerLookAnimationRef.current =
          requestAnimationFrame(animatePointerLook);
      }
    }

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);

      if (pointerLookAnimationRef.current) {
        cancelAnimationFrame(pointerLookAnimationRef.current);
      }
    };
  }, [
    checkingInput,
    checkingInputLegacy,
    isChecking,
    isPasswordFocused,
    lookInput,
    lookInputCamel,
    lookInputLower,
    lookValue,
  ]);

  useEffect(() => {
    if (triggerSuccess > lastSuccessRef.current) {
      lastSuccessRef.current = triggerSuccess;
      pendingSuccessRef.current = true;
    }

    if (pendingSuccessRef.current && successInput) {
      fireTrigger(successInput);
      pendingSuccessRef.current = false;
    }
  }, [successInput, triggerSuccess]);

  useEffect(() => {
    if (triggerFail > lastFailRef.current) {
      lastFailRef.current = triggerFail;
      pendingFailRef.current = true;
    }

    if (pendingFailRef.current && failInput) {
      fireTrigger(failInput);
      pendingFailRef.current = false;
    }
  }, [failInput, triggerFail]);

  return (
    <div className="login-mascot" aria-hidden="true">
      <RiveComponent className="login-mascot__canvas" />
    </div>
  );
}

export default LoginMascot;
