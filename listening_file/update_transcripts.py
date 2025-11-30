import json
import os

# Transcripts mapping
transcripts = {
    "Lesson 1 Budget Cuts.json": """Anna: Hum. Oh! "Important meeting. Everyone must come." Well, back to work! And my boss has called a meeting. I wonder what it's about. Maybe we're all getting raises! Ooo, there's Jonathan! Maybe he knows.

Professor Bot: Hi! I'm Professor Bot! This video is all about work. People talk about jobs and things that happen at work. Your assignment is to find as many work words as you can. Don't worry, I'll help.

Anna: So, Jonathan, what do you think today's meeting is about? The email sounded important.

Jonathan: Well, I have heard people in the building talking about budget cuts.

Anna: Oh! Budget cuts? Wait, who has been talking about budget cuts?

Jonathan: Mark in Accounting.

Anna: Mark in Accounting? That's one person. That's not "people."

Jonathan: I know, but Mark knows everything that goes on at The Studio.

Anna: That is true. But wait, look at us. We shouldn't gossip. That's how rumors start. We'll just go to the meeting and see what happens.

Jonathan: You're right. No more talk about budget cuts.

Amelia: Budget cuts? Oh no!

Amelia: I just heard Anna and Jonathan talking about budget cuts.

Kaveh: That must be what the meeting is about. When there are budget cuts, people lose their jobs.

Amelia: Not you. You're a good reporter.

Kaveh: And it's not you. You've done a great job as a videographer.

Amelia: I can't go back to being a detective. Criminals scare me!

Kaveh: And I can't go back to being a teacher! High school kids scare me!

Professor Bot: Did you hear any work words? They talked about a lot of jobs. You can make the name of a job by adding an ending to a verb! Kaveh reports, so, he's a reporter. Amelia used to detect, so she was a detective. If you teach, you're a teacher. And a videographer….uh, I think you understand. Back to the story.

Kaveh: Penelope, have you heard the news? Today's meeting is about budget cuts.

Penelope: That's awful! What should I do?

Kaveh: Update your résumé. I've already updated mine. I'll see you at the meeting.

Ms. Weaver: Hello everyone! Quiet, please. Quiet, please!

Ms. Weaver: This meeting won't take long. Then you can all leave.

Ms. Weaver: What is wrong with everyone? You look like I'm going to fire you. Ha-ha-ha-ha-ha! Seriously, what is wrong with everyone?

Anna: Excuse me, Ms. Weaver?

Ms. Weaver: Yes, Anna.

Anna: Well, everyone has been worrying about, you know … We've been worrying that you are going to fire us!

Ms. Weaver: I'm not going to fire any of you! No! The reason for this meeting is to tell you what a good job you've been doing and give out new assignments. Budget cuts have been happening. But only one person has lost their job -- Mark in Accounting? Now, let's talk about those new assignments.

Professor Bot: Ms. Weaver's team is doing a good job! How did you do? Did you find all of the work words? Here's a list you can check.""",
    
    "Lesson 2 The Interview.json": """Anna: Ms. Weaver is giving new assignments out. I am ready to take on anything she gives me. Well, except reporting traffic from a helicopter. Wish me luck.

Professor Bot: I wonder what Anna's new assignment will be? Professor Bot here! While you are watching, look for phrasal, or two-word verbs. Some stay together, like "go back" and some can come apart, like "give [assignments] out." Good luck, Anna!

Ms. Weaver: So, as I said at the meeting last week, I have new assignments for everyone at The Studio. Anna, you're good at asking questions. So, I want you to go back to hosting and reporting.

Anna: That sounds great.

Ms. Weaver: You're also a team player. So, I want you team up with someone ...

Anna: That sounds even better!

Ms. Weaver: ... someone who is very "different" from you.

Anna: That sounds ... what do you mean "different"?

Ms. Weaver: Well, you are very cheerful, you're a people person. I want you to team up with someone who ... isn't.

Anna: Ms. Weaver, I will find that person.

Mimi: Excuse me. Are you using this chair?

Pete: Yes.

Anna: Pete, hi! Thanks for meeting me.

Pete: Sure. But I don't have lots of time, Anna. I'm busy looking for work.

Anna: Pete, you can tear these want ads up and throw them away! I have good news!

Pete: Anna, I was working on that crossword puzzle.

Anna: Oh. Sorry. Sorry. Pete, forget about the crossword puzzle. I have a job offer for you!

Pete: I'm listening.

Anna: My boss wants me to team up with someone to host a talk show. But the person must be different from me. So, I thought of you.

Pete: Different from you? What do you mean?

Anna: I'm sorry, Pete, I don't have time right now. Here's my boss's address. Your interview is tomorrow morning at 10 am.

Pete: But what do you mean "different"?

Anna: Just be yourself, Pete. Just be yourself.

Professor Bot: Did you find any two-word verbs? Here's one example. Pete can throw the want ads away! Throw away is a two-word verb.

Ms. Weaver: Thanks for coming in, Pete.

Pete: Thanks for the opportunity, Ms. Weaver.

Ms. Weaver: I need to find out if you have the skills for this job. And I want you to be completely honest.

Pete: Okay.

Ms. Weaver: First, let's talk about your personal skills. Pete, are you a people person?

Pete: Well, okay, sometimes I think people talk too much.

Ms. Weaver: Pete, what work of yours are you most proud of?

Pete: Last year, I locked myself in a cabin and wrote a book. I didn't speak to anybody the entire time! It was the best two months of my life.

Ms. Weaver: Okay. I think I've heard enough.

Anna: Hey! Hey, Pete, how was the interview with Ms. Weaver?

Pete: Well, she said I was grumpy and not good with people.

Anna: And … ?

Pete: And, I got the job!

Anna: I knew it! Congratulations! Let's go celebrate.

Pete: Okay!

Professor Bot: Did you find more two-word verbs? Here is the list."""
}

def update_json_file(filepath, transcript):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    data['fullTranscript'] = transcript
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# Update files
base_dir = r"c:\Users\ADMIN\Desktop\listening_file"
for filename, transcript in transcripts.items():
    filepath = os.path.join(base_dir, "Beginner", filename)
    if os.path.exists(filepath):
        update_json_file(filepath, transcript)
        print(f"Updated {filename}")
    else:
        print(f"File not found: {filepath}")

print("Done!")

