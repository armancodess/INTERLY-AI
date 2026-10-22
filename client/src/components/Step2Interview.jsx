import React, { useEffect, useRef, useState } from "react";
import maleVideo from "../assets/videos/male-ai.mp4";
import femaleVideo from "../assets/videos/female-ai.mp4";
import Timer from "./Timer";
import { motion } from "motion/react";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import axios from "axios";
import { ServerUrl } from "../App";
import { BsArrowRight } from "react-icons/bs";

function Step2Interview({ interviewData, onFinish }) {
    const { interviewId, questions, userName } = interviewData;

    const [isIntroPhase, setIsIntroPhase] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isAIPlaying, setIsAIPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answer, setAnswer] = useState("");
    const [feedback, setFeedback] = useState("");
    const [timeLeft, setTimeLeft] = useState(questions[0]?.timeLimit || 60);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [voiceGender, setVoiceGender] = useState("female");
    const [subtitle, setSubtitle] = useState("");
    const [speechError, setSpeechError] = useState(() => {
        const isSpeechRecognitionSupported =
            typeof window !== "undefined" &&
            (window.SpeechRecognition || window.webkitSpeechRecognition);

        return isSpeechRecognitionSupported
            ? ""
            : "Speech-to-text is not available here. Use the latest Google Chrome and open this page over HTTPS.";
    });
    const [hasSpeechNetworkFailure, setHasSpeechNetworkFailure] = useState(false);
    const [isInstallingOfflineSpeech, setIsInstallingOfflineSpeech] = useState(false);
    const [supportsOnDeviceSpeech] = useState(() =>
        typeof window !== "undefined" &&
        (() => {
            const SpeechRecognition =
                window.SpeechRecognition || window.webkitSpeechRecognition;
            return Boolean(SpeechRecognition?.available && SpeechRecognition?.install);
        })()
    );

    const videoRef = useRef(null);
    const recognitionRef = useRef(null);
    const recognitionConstructorRef = useRef(null);
    const recognitionRestartTimerRef = useRef(null);
    const networkFailureCountRef = useRef(0);
    const isMicOnRef = useRef(true);
    const isAIPlayingRef = useRef(false);
    const answerRef = useRef("");
    const currentQuestion = questions[currentIndex];

    useEffect(() => {
        isMicOnRef.current = isMicOn;
    }, [isMicOn]);

    useEffect(() => {
        answerRef.current = answer;
    }, [answer]);

    useEffect(() => {
        const loadVoices = () => {
            if (!("speechSynthesis" in window)) return;

            const voices = window.speechSynthesis.getVoices();
            if (!voices.length) return;

            const femaleVoice = voices.find((voice) =>
                ["zira", "samantha", "female"].some((name) =>
                    voice.name.toLowerCase().includes(name)
                )
            );

            if (femaleVoice) {
                setSelectedVoice(femaleVoice);
                setVoiceGender("female");
                return;
            }

            const maleVoice = voices.find((voice) =>
                ["david", "mark"].some((name) =>
                    voice.name.toLowerCase().includes(name)
                )
            );

            if (maleVoice) {
                setSelectedVoice(maleVoice);
                setVoiceGender("male");
                return;
            }

            setSelectedVoice(voices[0]);
            setVoiceGender("female");
        };

        loadVoices();

        if ("speechSynthesis" in window) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            if ("speechSynthesis" in window) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, []);

    const videoSource = voiceGender === "male" ? maleVideo : femaleVideo;

    const stopMic = () => {
        window.clearTimeout(recognitionRestartTimerRef.current);
        recognitionRestartTimerRef.current = null;

        const recognition = recognitionRef.current;
        if (!recognition) return;

        try {
            recognition.stop();
        } catch (error) {
            if (error?.name !== "InvalidStateError") {
                console.error("Could not stop microphone:", error);
                setSpeechError("Could not stop the microphone. Please try again.");
            }
        }
    };

    const startMic = () => {
        const recognition = recognitionRef.current;

        if (
            !recognition ||
            !isMicOnRef.current ||
            isAIPlayingRef.current ||
            isSubmittingRef.current ||
            feedbackRef.current ||
            isIntroPhaseRef.current
        ) {
            return;
        }

        try {
            recognition.start();
        } catch (error) {
            // Chrome throws InvalidStateError if recognition is already running.
            // Log unexpected errors so they can be diagnosed in DevTools.
            if (error?.name !== "InvalidStateError") {
                console.error("Could not start microphone:", error);
                setSpeechError("Could not start the microphone. Check browser permissions and try again.");
            }
        }
    };

    useEffect(() => {
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error("SpeechRecognition is not supported in this browser.");
            return;
        }

        recognitionConstructorRef.current = SpeechRecognition;
        const recognition = new SpeechRecognition();
        const hasOnDeviceSpeechSupport = Boolean(
            SpeechRecognition.available && SpeechRecognition.install
        );
        recognition.lang = "en-US";
        recognition.continuous = true;
        recognition.interimResults = false;
        if (hasOnDeviceSpeechSupport) {
            SpeechRecognition.available({
                langs: ["en-US"],
                processLocally: true,
            })
                .then((availability) => {
                    if (availability === "available" && recognitionRef.current === recognition) {
                        recognition.processLocally = true;
                    }
                })
                .catch((error) => {
                    console.warn("Could not check on-device speech availability:", error);
                });
        }

        recognition.onresult = (event) => {
            let newTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                if (event.results[i].isFinal) {
                    newTranscript += event.results[i][0].transcript;
                }
            }

            const cleanTranscript = newTranscript.trim();

            if (cleanTranscript) {
                networkFailureCountRef.current = 0;
                setHasSpeechNetworkFailure(false);
                setSpeechError("");
                setAnswer((previousAnswer) => {
                    const updatedAnswer = previousAnswer
                        ? `${previousAnswer.trim()} ${cleanTranscript}`
                        : cleanTranscript;

                    answerRef.current = updatedAnswer;
                    return updatedAnswer;
                });
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);

            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                isMicOnRef.current = false;
                setIsMicOn(false);
                setSpeechError(
                    "Microphone access is blocked. Allow microphone access for this site in your browser settings."
                );
            } else if (event.error === "audio-capture") {
                isMicOnRef.current = false;
                setIsMicOn(false);
                setSpeechError(
                    "No microphone was found. Connect or enable a microphone, then try again."
                );
            } else if (event.error === "no-speech") {
                // No speech was detected. The user can continue speaking.
                console.warn("No speech detected.");
            } else if (event.error === "network") {
                networkFailureCountRef.current += 1;
                setHasSpeechNetworkFailure(true);
                const retryCount = networkFailureCountRef.current;
                setSpeechError(
                    retryCount <= 3
                        ? `The browser speech service lost its connection. Retrying (${retryCount}/3)...`
                        : hasOnDeviceSpeechSupport
                            ? "The browser speech service is unreachable. Switch to offline speech recognition below."
                            : "The browser speech service is unreachable. Check your internet connection or use the latest Chrome with offline speech recognition."
                );
            } else if (event.error !== "aborted") {
                isMicOnRef.current = false;
                setIsMicOn(false);
                setSpeechError(`Microphone error: ${event.error}. Try clicking the mic button again.`);
            }
        };

        recognition.onend = () => {
            recognitionRestartTimerRef.current = null;

            if (
                isMicOnRef.current &&
                !isAIPlayingRef.current &&
                !isSubmittingRef.current &&
                !feedbackRef.current &&
                !isIntroPhaseRef.current &&
                networkFailureCountRef.current <= 3
            ) {
                const restartDelay = networkFailureCountRef.current
                    ? Math.min(1000 * 2 ** (networkFailureCountRef.current - 1), 10000)
                    : 250;

                recognitionRestartTimerRef.current = window.setTimeout(() => {
                    recognitionRestartTimerRef.current = null;
                    if (
                        isMicOnRef.current &&
                        !isAIPlayingRef.current &&
                        !isSubmittingRef.current &&
                        !feedbackRef.current &&
                        !isIntroPhaseRef.current
                    ) {
                        startMic();
                    }
                }, restartDelay);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            window.clearTimeout(recognitionRestartTimerRef.current);
            recognitionRestartTimerRef.current = null;
            recognition.onresult = null;
            recognition.onerror = null;
            recognition.onend = null;

            try {
                recognition.abort();
            } catch (error) {
                // Ignore cleanup errors.
            }

            recognitionRef.current = null;
        };
    }, []);

    const isSubmittingRef = useRef(false);
    const feedbackRef = useRef("");
    const isIntroPhaseRef = useRef(true);

    useEffect(() => {
        isSubmittingRef.current = isSubmitting;
    }, [isSubmitting]);

    useEffect(() => {
        feedbackRef.current = feedback;
    }, [feedback]);

    useEffect(() => {
        isIntroPhaseRef.current = isIntroPhase;
    }, [isIntroPhase]);

    const speakText = (text) => {
        return new Promise((resolve) => {
            if (!("speechSynthesis" in window) || !selectedVoice) {
                resolve();
                return;
            }

            window.speechSynthesis.cancel();

            const humanText = text
                .replace(/,/g, ", ... ")
                .replace(/\./g, ". ... ");

            const utterance = new SpeechSynthesisUtterance(humanText);
            utterance.voice = selectedVoice;
            utterance.rate = 0.92;
            utterance.pitch = 1.05;
            utterance.volume = 1;

            utterance.onstart = () => {
                isAIPlayingRef.current = true;
                setIsAIPlaying(true);
                stopMic();

                if (videoRef.current) {
                    videoRef.current.play().catch(() => {
                        // Video playback may be blocked; speech can continue.
                    });
                }
            };

            utterance.onend = () => {
                if (videoRef.current) {
                    videoRef.current.pause();
                    videoRef.current.currentTime = 0;
                }

                isAIPlayingRef.current = false;
                setIsAIPlaying(false);

                setTimeout(() => {
                    setSubtitle("");
                    resolve();

                    if (
                        isMicOnRef.current &&
                        !isSubmittingRef.current &&
                        !feedbackRef.current
                    ) {
                        startMic();
                    }
                }, 300);
            };

            utterance.onerror = (event) => {
                console.error("Speech synthesis error:", event.error);
                isAIPlayingRef.current = false;
                setIsAIPlaying(false);
                resolve();
            };

            setSubtitle(text);
            window.speechSynthesis.speak(utterance);
        });
    };

    useEffect(() => {
        if (!selectedVoice) return;

        let cancelled = false;

        const runIntroOrQuestion = async () => {
            if (isIntroPhase) {
                await speakText(
                    `Hi ${userName}, it's great to meet you today. I hope you're feeling confident and ready.`
                );

                if (cancelled) return;

                await speakText(
                    "I'll ask you a few questions. Just answer naturally, and take your time. Let's begin."
                );

                if (cancelled) return;

                setIsIntroPhase(false);
            } else if (currentQuestion) {
                await new Promise((resolve) => setTimeout(resolve, 800));

                if (cancelled) return;

                if (currentIndex === questions.length - 1) {
                    await speakText("Alright, this one might be a bit more challenging.");
                }

                if (cancelled) return;

                await speakText(currentQuestion.question);

                if (!cancelled && isMicOnRef.current) {
                    startMic();
                }
            }
        };

        runIntroOrQuestion();

        return () => {
            cancelled = true;
        };
    }, [selectedVoice, isIntroPhase, currentIndex]);

    useEffect(() => {
        if (isIntroPhase || !currentQuestion) return undefined;

        const timer = setInterval(() => {
            setTimeLeft((previousTime) => {
                if (previousTime <= 1) {
                    clearInterval(timer);
                    return 0;
                }

                return previousTime - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isIntroPhase, currentIndex, currentQuestion]);

    useEffect(() => {
        if (!isIntroPhase && currentQuestion) {
            setTimeLeft(currentQuestion.timeLimit || 60);
        }
    }, [currentIndex, isIntroPhase, currentQuestion]);

    const toggleMic = () => {
        if (isMicOn) {
            isMicOnRef.current = false;
            setIsMicOn(false);
            stopMic();
        } else {
            isMicOnRef.current = true;
            networkFailureCountRef.current = 0;
            setHasSpeechNetworkFailure(false);
            setIsMicOn(true);
            setSpeechError("");

            if (!isAIPlayingRef.current) {
                startMic();
            }
        }
    };

    const enableOfflineSpeech = async () => {
        const SpeechRecognition = recognitionConstructorRef.current;
        const recognition = recognitionRef.current;
        if (!SpeechRecognition?.install || !recognition || isInstallingOfflineSpeech) {
            return;
        }

        isMicOnRef.current = false;
        setIsMicOn(false);
        window.clearTimeout(recognitionRestartTimerRef.current);
        recognitionRestartTimerRef.current = null;
        setIsInstallingOfflineSpeech(true);

        try {
            await new Promise((resolve, reject) => {
                let timeout;
                const previousOnEnd = recognition.onend;
                const handleEnd = (event) => {
                    window.clearTimeout(timeout);
                    recognition.onend = previousOnEnd;
                    previousOnEnd?.call(recognition, event);
                    resolve();
                };

                recognition.onend = handleEnd;
                timeout = window.setTimeout(() => {
                    if (recognition.onend === handleEnd) {
                        recognition.onend = previousOnEnd;
                    }
                    resolve();
                }, 1500);

                try {
                    recognition.stop();
                } catch (error) {
                    window.clearTimeout(timeout);
                    recognition.onend = previousOnEnd;
                    if (error?.name === "InvalidStateError") {
                        resolve();
                    } else {
                        reject(error);
                    }
                }
            });

            const installed = await SpeechRecognition.install({ langs: ["en-US"] });
            if (!installed) {
                throw new Error("The English offline speech pack could not be installed.");
            }

            recognition.processLocally = true;
            networkFailureCountRef.current = 0;
            setHasSpeechNetworkFailure(false);
            setSpeechError("");
            isMicOnRef.current = true;
            setIsMicOn(true);
            window.setTimeout(startMic, 250);
        } catch (error) {
            console.error("Could not enable offline speech recognition:", error);
            isMicOnRef.current = true;
            setIsMicOn(true);
            setSpeechError(
                "Could not install offline speech recognition. Check Chrome is up to date and try again."
            );
            window.setTimeout(startMic, 250);
        } finally {
            setIsInstallingOfflineSpeech(false);
        }
    };

    const submitAnswer = async () => {
        if (isSubmittingRef.current || !currentQuestion) return;

        stopMic();
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        setSpeechError("");

        try {
            const result = await axios.post(
                ServerUrl + "/api/interview/submit-answer",
                {
                    interviewId,
                    questionIndex: currentIndex,
                    answer: answerRef.current,
                    timeTaken: currentQuestion.timeLimit - timeLeft,
                },
                { withCredentials: true }
            );

            setFeedback(result.data.feedback || "");
            feedbackRef.current = result.data.feedback || "";

            if (result.data.feedback) {
                await speakText(result.data.feedback);
            }
        } catch (error) {
            console.error("Submit answer failed:", error);
            setSpeechError(
                error?.response?.data?.message ||
                "Could not submit your answer. Please check your connection and try again."
            );
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    const handleNext = async () => {
        stopMic();
        setAnswer("");
        answerRef.current = "";
        setFeedback("");
        feedbackRef.current = "";
        setSpeechError("");

        if (currentIndex + 1 >= questions.length) {
            await finishInterview();
            return;
        }

        await speakText("Alright, let's move to the next question.");
        setCurrentIndex((previousIndex) => previousIndex + 1);
    };

    const finishInterview = async () => {
        stopMic();
        isMicOnRef.current = false;
        setIsMicOn(false);

        try {
            const result = await axios.post(
                ServerUrl + "/api/interview/finish",
                { interviewId },
                { withCredentials: true }
            );

            onFinish(result.data);
        } catch (error) {
            console.error("Finish interview failed:", error);
            setSpeechError(
                error?.response?.data?.message ||
                "Could not finish the interview. Please try again."
            );
        }
    };

    useEffect(() => {
        if (isIntroPhase || !currentQuestion) return;

        if (timeLeft === 0 && !isSubmitting && !feedback) {
            submitAnswer();
        }
    }, [timeLeft, isIntroPhase, currentIndex, isSubmitting, feedback]);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.onresult = null;
                    recognitionRef.current.onerror = null;
                    recognitionRef.current.onend = null;
                    recognitionRef.current.abort();
                } catch (error) {
                    // Ignore cleanup errors.
                }
            }

            if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-100 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-[1400px] min-h-[80vh] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col lg:flex-row overflow-hidden">
                {/* Video section */}
                <div className="w-full lg:w-[35%] bg-white flex flex-col items-center p-6 space-y-6 border-r border-gray-200">
                    <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl">
                        <video
                            src={videoSource}
                            key={videoSource}
                            ref={videoRef}
                            muted
                            playsInline
                            preload="auto"
                            className="w-full h-auto object-cover"
                        />
                    </div>

                    {/* Subtitle */}
                    {subtitle && (
                        <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                            <p className="text-gray-700 text-sm sm:text-base font-medium text-center leading-relaxed">
                                {subtitle}
                            </p>
                        </div>
                    )}

                    {/* Timer area */}
                    <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-md p-6 space-y-5">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Interview Status</span>
                            {isAIPlaying && (
                                <span className="text-sm font-semibold text-purple-600">
                                    AI Speaking
                                </span>
                            )}
                        </div>

                        <div className="h-px bg-gray-200" />

                        <div className="flex justify-center">
                            <Timer
                                timeLeft={timeLeft}
                                totalTime={currentQuestion?.timeLimit}
                            />
                        </div>

                        <div className="h-px bg-gray-200" />

                        <div className="grid grid-cols-2 gap-6 text-center">
                            <div>
                                <span className="text-2xl font-bold text-purple-600">
                                    {currentIndex + 1}
                                </span>
                                <span className="text-xs text-gray-400 block">
                                    Current Question
                                </span>
                            </div>

                            <div>
                                <span className="text-2xl font-bold text-purple-600">
                                    {questions.length}
                                </span>
                                <span className="text-xs text-gray-400 block">
                                    Total Questions
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Text section */}
                <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 relative">
                    <h2 className="text-xl sm:text-2xl font-bold text-purple-600 mb-6">
                        AI Smart Interview
                    </h2>

                    {!isIntroPhase && (
                        <div className="relative mb-6 bg-gray-50 p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <p className="text-xs sm:text-sm text-gray-400 mb-2">
                                Question {currentIndex + 1} of {questions.length}
                            </p>
                            <div className="text-base sm:text-lg font-semibold text-gray-800 leading-relaxed">
                                {currentQuestion?.question}
                            </div>
                        </div>
                    )}

                    <textarea
                        placeholder="Type your answer here..."
                        onChange={(event) => {
                            setAnswer(event.target.value);
                            answerRef.current = event.target.value;
                        }}
                        value={answer}
                        className="flex-1 min-h-[220px] bg-gray-100 p-4 sm:p-6 rounded-2xl resize-none outline-none border border-gray-200 focus:ring-2 focus:ring-purple-500 transition text-gray-800"
                    />

                    {speechError && (
                        <div className="mt-3">
                            <p className="text-sm text-red-600" role="alert">
                                {speechError}
                            </p>
                            {supportsOnDeviceSpeech && hasSpeechNetworkFailure && (
                                <button
                                    type="button"
                                    onClick={enableOfflineSpeech}
                                    disabled={isInstallingOfflineSpeech}
                                    className="mt-2 text-sm font-semibold text-purple-700 underline disabled:opacity-60"
                                >
                                    {isInstallingOfflineSpeech
                                        ? "Installing offline speech recognition..."
                                        : "Switch to offline speech recognition"}
                                </button>
                            )}
                        </div>
                    )}

                    {!feedback ? (
                        <div className="flex items-center gap-4 mt-6">
                            <motion.button
                                type="button"
                                onClick={toggleMic}
                                whileTap={{ scale: 0.9 }}
                                aria-label={isMicOn ? "Turn microphone off" : "Turn microphone on"}
                                title={isMicOn ? "Turn microphone off" : "Turn microphone on"}
                                className={`w-12 h-12 sm:h-14 flex items-center justify-center rounded-full text-white shadow-lg ${
                                    isMicOn ? "bg-black" : "bg-gray-500"
                                }`}
                            >
                                {isMicOn ? (
                                    <FaMicrophone size={20} />
                                ) : (
                                    <FaMicrophoneSlash size={20} />
                                )}
                            </motion.button>

                            <motion.button
                                type="button"
                                onClick={submitAnswer}
                                disabled={isSubmitting}
                                whileTap={{ scale: 0.95 }}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-teal-500 text-white py-3 sm:py-4 rounded-2xl shadow-lg hover:opacity-90 transition font-semibold disabled:bg-gray-500"
                            >
                                {isSubmitting ? "Submitting..." : "Submit Answer"}
                            </motion.button>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-6 bg-purple-50 border border-purple-200 p-5 rounded-2xl shadow-sm"
                        >
                            <p className="text-purple-700 font-medium mb-4">{feedback}</p>

                            <button
                                type="button"
                                onClick={handleNext}
                                className="w-full bg-gradient-to-r from-purple-600 to-teal-500 text-white py-3 rounded-xl shadow-md hover:opacity-90 transition flex items-center justify-center gap-1"
                            >
                                Next Question <BsArrowRight size={18} />
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Step2Interview;
