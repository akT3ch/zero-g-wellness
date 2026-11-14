export type MissionStoryChoice = {
  label: string;
  response: string;
};

export type MissionStoryChapter = {
  day: number;
  title: string;
  location: string;
  speaker: string;
  entry: string;
  choices: readonly [MissionStoryChoice, MissionStoryChoice];
};

export const missionStory: MissionStoryChapter[] = [
  {
    day: 1,
    title: "A small blue morning",
    location: "Transit habitat · observation window",
    speaker: "Commander Vega",
    entry:
      "Earth is already a bright dot. Before the days become numbers, the crew agrees to leave one small note for the people who will read this log later.",
    choices: [
      {
        label: "Record a message for the next crew",
        response:
          "Vega records the sound of the galley fan and the crew laughing over breakfast. The ordinary details feel worth carrying forward.",
      },
      {
        label: "Keep a private line in the ship log",
        response: "A short line goes into the shared log: “We are here, together, and beginning.”",
      },
    ],
  },
  {
    day: 6,
    title: "The windowless dawn",
    location: "Transit habitat · sleep station",
    speaker: "Flight engineer Chen",
    entry:
      "The habitat has no sunrise. Chen suggests that the crew make their own gentle transition between watch and rest, a small ritual that belongs to this ship.",
    choices: [
      {
        label: "Try a shared quiet hour",
        response:
          "The crew dims the common room lights and leaves a note for the next watch. The ship feels a little less like a timetable.",
      },
      {
        label: "Trade stories at the watch handover",
        response:
          "One short story becomes part of the handover. Tomorrow, someone else will bring one.",
      },
    ],
  },
  {
    day: 11,
    title: "Twelve minutes of silence",
    location: "Communications bay",
    speaker: "Mission specialist Okafor",
    entry:
      "A message from Earth takes its time crossing the distance. Okafor jokes that the pause is long enough to make tea, then saves a reply for the next communication window.",
    choices: [
      {
        label: "Send a question for the next window",
        response:
          "The crew asks Earth what the sky looked like at home tonight. The answer can wait; wondering together cannot.",
      },
      {
        label: "Leave a voice note for the archive",
        response:
          "The crew records a greeting for whoever studies this mission years from now. The quiet between messages becomes part of the story.",
      },
    ],
  },
  {
    day: 16,
    title: "A room full of clocks",
    location: "Transit habitat · common room",
    speaker: "Commander Vega",
    entry:
      "The days feel crowded, even when the common room is quiet. Vega pauses the agenda and asks the crew what would make the next watch feel more like a team effort.",
    choices: [
      {
        label: "Make space for an unhurried check-in",
        response:
          "Each person gets a turn without needing to solve anything. The next agenda can wait until everyone has been heard.",
      },
      {
        label: "Plan one small crew tradition",
        response:
          "The crew chooses a song for the next meal together. It is a small tradition, but now it belongs to all of them.",
      },
    ],
  },
  {
    day: 21,
    title: "The long wait",
    location: "Transit habitat · shelter area",
    speaker: "Flight engineer Chen",
    entry:
      "A simulated solar-weather event interrupts the routine. The crew follows its established mission procedures; once the checklist is complete, Chen asks how they want to mark the wait together.",
    choices: [
      {
        label: "Tell a story from the first week",
        response:
          "The first-week breakfast story returns, with new details added by everyone who was there.",
      },
      {
        label: "Record the sounds of the habitat",
        response:
          "The crew saves a minute of cabin sounds: ventilation, a pencil tapping, and someone humming softly.",
      },
    ],
  },
  {
    day: 22,
    title: "A signal back",
    location: "Communications bay",
    speaker: "Mission specialist Okafor",
    entry:
      "The event passes in the simulation and the crew begins its next chapter. Okafor drafts a note about what the team learned by making room for one another.",
    choices: [
      {
        label: "Share the crew's lesson with Earth",
        response:
          "The message is ready for the next window: a mission is measured in more than distance; it is also made of people looking out for one another.",
      },
      {
        label: "Save the lesson for the next crew",
        response: "The note joins the ship log, a small handrail for the crew that will follow.",
      },
    ],
  },
];

export function getMissionStoryChapter(day: number): MissionStoryChapter {
  return [...missionStory].reverse().find((chapter) => chapter.day <= day) ?? missionStory[0]!;
}
