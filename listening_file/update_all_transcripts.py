import json
import os

# All transcripts mapping
transcripts = {
    # Intermediate - Arts & Culture
    "The Westminster Kennel Club Dog Show, the 'Super Bowl' of Dog Shows.json": """At America's 149th Westminster Kennel Club dog show, Monty the giant schnauzer won the top prize.

The lively schnauzer beat six other finalists in New York City to become the first of his breed to win Westminster's "best in show." The prize is the most important and respected in the U.S. dog show world.

While Monty came close to winning Westminster the past two years, he fell short of the big prize. In December 2024, the dog won another big prize, the huge American Kennel Club championship.

But for dog show lovers, Westminster is considered the Super Bowl of all shows. This year the comparison is especially fitting. That is because the most respected U.S. dog competition opened on the same weekend as the Super Bowl -- the most important game in American professional football. This rare happening came after the dates of both competitions changed in recent years.

At Westminster, dogs first compete against other members of their breed. Then, the winner of each breed goes up against other dogs within different competition "groups." Among the groups are sporting, working, toy, and herding. Group winners then compete in the final round.

The best in show winner gets an award – a large, shiny cup called a trophy – and a place in dog-world history. The top prize, however, does not include money.

In her report on the dog show, Learning English's Caty Weaver explains that the Westminster show dates back to 1877. It centers on the traditional purebred judging that leads to the best in show prize. But over the last few years, the organization has added agility and obedience events open to mixed-breed dogs.

In 2024, Sage, a miniature poodle, won best in show at the 148th Westminster Kennel Club dog show.

And in 2023, a petit basset griffon Vendéen, named Buddy Holly, won best in show at Westminster. The breed he represents is known for its rabbit-hunting abilities.

I'm Anna Matteo.""",
    
    # Intermediate - Health & Lifestyle
    "How Physical Therapists Can Prevent Future Health Problems.json": """Many of us might only seek out physical therapists if we are recovering from accidental injuries or surgery. However, medical experts say these specialists can also help prevent many health problems if they are seen on a regular basis.

One leader in the industry, Sharon Dunn, even calls physical therapists "the best-kept secret in health care." Dunn is the past president of the American Physical Therapy Association (APTA).

She recently told The Associated Press she thinks people need to look at physical therapists in a new way – as health practitioners who can help identify possible medical issues before they appear.

Other health experts share this opinion. They include Roger Herr, the current president of the APTA, and Gammon Earhart of Washington University in St. Louis. They both shared Dunn's prevention message in separate discussions with the AP.

Follow the example of dental care

Earhart urges people to think about physical therapists just as they do dentists. "Even if you're not having any problem, you go in and have everything checked out." She noted that such examinations could help find and deal with problems early.

For example, an exam could include a patient's health history and current health – things like physical activity, sleep, nutrition, and so on. This could be followed by a look at how a person is moving. Exams might uncover things like postural issues or unusual body movements.

Herr is a big supporter of yearly wellness visits. He told the AP he believes physical therapists can be helpful for all kinds of people – the young, athletes, or anyone who wants to be as "independent as possible."

Think prevention

In the United States, you can now visit a physical therapist in all 50 states without needing permission from a doctor or surgeon.

However, a yearly exam might not be covered by a person's health insurance. This could prevent some from seeking out care.

Earhart estimated such a visit in areas across the U.S. Midwest might cost around $150. Herr suggested a cost of $200-$300 in more costly areas. But both experts said that in the long run, such exams might save money and can add healthy years.

"I think if people understood more that the way they move might be setting them up for a problem down the line, they'd be much more inclined to see a physical therapist," Earhart said.

The hips for ballet — or not

We are all built differently. So, it might be useful to examine children early to see what sports or activities might be good for them. Physical therapists can carry out such early exams.

Earhart said, "If we screened kids as they were choosing sports and said this sport is probably not the right kind of stress for the way you are put together, it could save a lot pain and problems down the line." She added about children, "Maybe they don't have the hips for ballet."

Distance runners could also think this way. Some are built to avoid injuries despite running many kilometers while others are not. Exams by physical therapists could help identify future problems.

Fear of falling and issues with weight

Another area where physical therapists can help is with fall prevention. Falling – and the fear of falling – can be major issues, especially for the aging population.

"You want to show people they can get back up if they fall," Herr said. "And once they know they can do it, it gives them confidence and it can help reduce the fear of falling."

He added, "One of the risks of falling is that people don't do anything, so you don't move and therefore you become more out of shape..."

Herr said one example could be to introduce exercises involving "floor to stand" movements. These can help improve flexibility, strength, balance, coordination, and planning.

"It sounds simple getting up from a lying position on the floor to stand," Herr said. "But it's a great exercise for all age groups."

Earhart estimated about half of physical therapy patients seek help to deal with issues related to being overweight. "The more weight somebody is carrying the higher the loads are on their joints," she said.

Herr said he had watched extremely overweight patients successfully lose large amounts of weight. He noted that some of these individuals are motivated for a specific reason. But for others, it is not always that clear and easy.

"I have seen people change based on a milestone, like having a kid and they really want to be a good parent," Herr said. "They want to be a fit parent, and the same thing with a grandparent. So that motivates people to engage because of a lifestyle change."

I'm John Russell. And I'm Jill Robbins.""",
    
    "How Daylight Saving Time Affects Health.json": """Much of the United States "springs forward" on Sunday, March 9th, for daylight saving time. Worldwide, many other countries also observe daylight saving time, starting and ending on different dates.

The time change can leave people tired and perhaps unhappy the next day. But it also might even harm health. Some studies have found an increase in heart attacks and strokes right after the March time change.

However, there are ways to ease the effects of the time change, including getting more sunshine. The light helps reset your circadian rhythm for healthful sleep.

When does daylight saving time start?

In the U.S., daylight saving time begins Sunday at 2:00 in the morning. The time change will reverse on November 2 when clocks "fall back" as daylight saving time ends.

The state of Hawaii and most of the state of Arizona do not make the spring change. Those areas remain on standard time along with Puerto Rico, American Samoa, Guam and the U.S. Virgin Islands.

Some people try to prepare for the change to daylight saving time by going to bed a little earlier two or three nights ahead. But with a third of American adults already not getting the suggested seven hours of nightly sleep, catching up can be difficult.

The brain

The brain has a kind of clock that is set by exposure to sunlight and darkness. This clock, known as the circadian rhythm, is on a roughly 24-hour cycle. It governs when we become sleepy and when we are more wakeful. The rhythms change with age. This is one reason that early-to-rise young children turn into hard-to-wake teenagers.

Morning light resets the rhythm. By evening, levels of a hormone called melatonin begin to increase, leading to tiredness. Too much light in the evening — that extra hour from daylight saving time — delays the melatonin increase. As a result, the cycle gets delayed.

The circadian rhythm affects more than sleep. It also influences heart rate, blood pressure, hormone releases and other systems.

Health effects

Sleep deprivation, or lack of sleep, is linked to heart disease, weight conditions, problems with thinking and remembering, and more.

Deadly car crash numbers increase the first few days after the spring time change, a study of U.S. traffic deaths says. The risk of crashes is highest in the morning, it found. Researchers suggested sleep deprivation might be responsible.

The time change also has a link to the heart. The American Heart Association points to studies that suggest an increase in heart attacks on the Monday after daylight saving time begins, and in strokes for two days afterward.

Doctors already know that heart attacks, especially severe ones, are a bit more common on Mondays generally — and in the morning, when blood is more likely to clot.

Researchers do not know why the time change would add to that Monday connection. But it is possible the sudden circadian change influences other issues such as high blood pressure in people already at risk.

Prepare for daylight saving time

To prepare for daylight saving time, experts offer some advice. Slowly move bedtimes about 15 or 20 minutes earlier for several nights before the time change. Try to rise earlier the next morning, too. Go outside for early morning sunshine the first week of daylight saving time. This is another way to help reset your body's clock. Start daily activities, like dinner or exercise, a little earlier. This may help tell your body to start getting used to the new conditions, sleep experts suggest.

Daytime sleeping, the drug caffeine and light from phones and other electronic devices can make an earlier bedtime even harder.

End daylight saving time?

Americans have discussed ending daylight saving time. But so far, no official changes have been made.

Health groups such as the American Medical Association and American Academy of Sleep Medicine believe it is time to end time changes. The groups suggest that staying with standard time year-round works better for human biology and sleep needs.

I'm Caty Weaver.""",
    
    "Rise in ADHD Cases Raises Questions.json": """Allison Burk's daughter was struggling. The American teenager had uncontrolled emotions, a decreased ability to pay attention and trouble completing work on time. A family doctor suggested testing for attention-deficit/hyperactivity disorder, or ADHD.

This led to an unexpected discovery: The teen had ADHD, and her mother, Allison Burk, did too. During her daughter's testing, Burk thought, "Wait a minute. This sounds familiar."

"I was able to piece together that this might be something I was experiencing," said Burk, who lives in Columbus, Ohio. She sought testing for herself and was diagnosed with ADHD — at 42 years old.

More adults are being diagnosed with ADHD. Diagnoses have been rising for at least 20 years but seem to have increased sharply in the last few years.

A recent government study suggested that more than 15 million adults in the United States — about 1 in 17 — have been diagnosed with ADHD. The condition starts in childhood, but about half of adults with ADHD are diagnosed when they are 18 or older.

Some doctors say the number of people seeking ADHD testing is sharply increasing.

"Just in our clinic, requests for assessments have doubled in the last two years," said Justin Barterian. He is a psychologist based at Ohio State University.

Signs of ADHD in adults

ADHD makes it hard for people to pay attention and control their behaviors. The disorder can be genetic. Doctors often treat the disorder with drugs, behavioral therapy, or both.

Judy Sandler is 62 years old and lives in the U.S. state of Maine. She was diagnosed in her 50s. Sandler describes what ADHD feels like for her. "It's like there's an engine in you and you feel like it's always running, and you can't turn it off except with medication," Sandler said.

ADHD has been called the most commonly diagnosed mental health disorder in American children. More than 7 million children in the U.S. have been diagnosed. The disorder was once thought to be something that resolved as children became adults.

But now, experts say they believe that many people are not diagnosed as kids and that the disorder continues into adulthood.

Adults with the condition talk about having trouble focusing on immediate responsibilities and planning their time. Some say the disorder has led to problems in their personal relationships.

Diagnoses have been rising

Diagnoses have been increasing in both kids and adults. The recent government report also found adult ADHD was more common than earlier estimates had suggested.

"We haven't had (federal) adult ADHD data in a long time," said Angelika Claussen. The U.S. Centers for Disease Control and Prevention researcher was one of the study's writers.

There were signs of the rise, she added. Increasing demand for ADHD medication led to severe shortages after the COVID-19 pandemic hit in March 2020. A 2023 study showed the rise in prescriptions, or doctors' orders for such medication, was notable in adults — especially among women.

ADHD diagnoses and medication were increasing before the pandemic. This is partly because of a change in general diagnostic measures in 2013. Those changes expanded the definition of ADHD and reduced the number of signs, or symptoms, required for diagnosis.

But cases really seemed to increase in 2020, when schools closed and many adults were forced to work from home.

"It's very difficult to focus when you are home and you have kids," Claussen said. She said such conditions may have worsened ADHD symptoms in people with less severe cases.

How ADHD is diagnosed in adults

Experts say that it was long believed that ADHD was underdiagnosed in adults. Now, experts debate about whether it has become over-diagnosed.

There is no blood or brain test for the disorder. Experts say it is diagnosed when symptoms cause ongoing problems in more than one area of life, and when those symptoms began in early childhood. Experts say the best way professionals diagnose ADHD is by getting careful histories from patients and from people who know them. They also might test a patient's memory and ability to focus.

But getting an appointment with a mental health professional can take months. And assessments can cost thousands of dollars. Many people turn to family doctors. People also take online diagnostic tests, some of which are linked to health companies that prescribe medications.

"There is a wide variability in this country in how people diagnose, how strict they are, and who they diagnose," said Margaret Sibley. She is psychologist at University of Washington.

The American Professional Society of ADHD and Related Disorders is preparing a set of diagnosis and treatment guidelines for American health professionals who treat adults. Sibley is leading the work on the guidelines, which the organization expects to release later this year.

I'm Anna Matteo.

And I'm Jill Robbins.""",
    
    "New Flowering Plants for Gardeners to Try.json": """If you are a gardener, you probably have some favorite plants that you grow year after year. But you might also like to try new plants sometimes.

Gardening expert Jessica Damiano recently reported for the Associated Press about one way to find new plants that might appeal to growers.

Each year, the independent, nonprofit organization All-America Selections (AAS) enlists more than 80 horticultural professionals from around the United States and Canada to serve as plant-trial judges.

Today, we share newly developed flowering plants meant to improve the appearance of your garden.

Plants for a beautiful garden

Celosia Flamma Pink is an upright flowering plant.

This pink variety is the latest introduction in the Flamma Celosia series. It is a small, easy-to-grow celosia noted for strong blooming and vibrant, long-lasting flowers.

Judges praised its good performance even in hot and humid weather. It also lasts a long time in a container after it is cut. The plant is bred by Clover Seed Company.

Vinca Sphere Polkadot is a flat wide-petaled flower.

Judges called this vinca variety resilient and beautiful. With a naturally tightly grouped, rounded appearance, the plant blooms throughout the summer. It grows well in hot, dry conditions and has good disease resistance and durability against heavy rain and storms. It is bred by Miyoshi & Co.

Zinnia Crestar Mix combines "the best" crested zinnias in one seed pack. The pink, orange, red, white, peach and yellow flower blends well for mass plantings and succession sowing. Succession sowing means growing several plants that bloom in different seasons in your garden. Zinnia Crestar Mix can also provide a continuous supply of cut flowers during summer. The sun-loving plants also tolerated heat and humidity well in the trials. It is bred by Takii Europe.

Dahlia Black Forest Ruby has ruby-red flowers that show up nicely against dark-colored leaves. The disease-resistant plant impressed judges with its overall durability. It was bred by Takii Europe B.V.

Dianthus Interspecific Capitán Magnifica is a new dianthus plant. It thrived through the test gardens' summer heat. Its pink flowers, that grow on long stems, can be used as cut flowers. Cutting the plants back after their first bloom can result in strong new growth and better flower production. This dianthus was bred by Selecta One.

Marigold Mango Tango is a marigold that has two-colored blooms: yellow and red. The small, strong plants provide nonstop color over an extended season. The variety was honored by European judges. It can be used for plantings in garden borders and in containers. Ernst Benary of America bred this variety.

Nasturtium Baby Gold, Nasturtium Baby Red, and Nasturtium Baby Yellow were also praised by European judges.

These new, small nasturtiums produce golden-yellow, rich red and soft yellow flowers that look pleasing next to their dark-green leaves. The judges praised their uniformly small appearance. Takii Europe BV bred these flowers.

Petunia Dekko Maxx Pink is easy to grow and grows quickly.

These spreading, flat blooms excited the judges during summer trials. Flowers covered the plants throughout the season and held up well against heavy rain and bad weather. It was bred by Syngenta Flowers.

Petunia Shake Raspberry F1 has been compared to "a blended raspberry milkshake swirled with lemon-lime green sorbet on a superior-performing petunia." This flower resisted heat and provided colorful blooms all season. It was bred by Hem Genetics BV.

Snapdragon DoubleShot Yellow Red Heart F1 smells like sweet candy. It bloomed earlier than similar varieties in the trials. Trial judges noted its healthy, strong growth, long-lasting flowers, and good heat tolerance. Hem Genetics also bred this variety.

And finally, Zinnia Zydeco Fire is a disease-resistant zinnia variety that is fiery orange colored with strong stems. Judges found its flowers to be larger and more resilient than those of similar plants. Syngenta Flowers bred this variety as well.

We hope this list provides you with ideas for your garden planting wherever you are.

I'm Caty Weaver.""",
    
    # Intermediate - Science & Technology
    "Wilbur and Orville Wright The First Airplane.json": """Wilbur and Orville Wright are the American inventors who made a small engine-powered flying machine. They proved that flight without the aid of gas-filled balloons was possible.

Wilbur Wright was born in 1867 near Melville, Indiana. His brother Orville was born four years later in Dayton, Ohio.

As they grew up, the Wright brothers experimented with mechanical things. Later, the Wright brothers began to design their own flying machine. They used ideas they had developed from earlier experiments with a toy helicopter, kites, the printing machine and bicycles.

Soon, they needed a place to test their ideas about flight. The best place with the best wind conditions seemed to be a piece of sandy land in North Carolina along the coast of the Atlantic Ocean. It was called Kill Devil Hill, near the town of Kitty Hawk.

The Wright brothers did many tests with gliders at Kitty Hawk. With these tests, they learned how to solve many problems.

By the autumn of 1903, Wilbur and Orville had designed and built an airplane powered by a gasoline engine. The plane had wings 12 meters across. It weighed about 340 kilograms, including the pilot.

On December 17th, 1903, they made the world's first flight in a machine that was heavier than air and powered by an engine. Orville flew the plane 36 meters. He was in the air for 12 seconds. The two brothers made three more flights that day.

Four other men watched the Wright brothers' first flights. One of the men took pictures. Few newspapers, however, noted the event.

It was almost five years before the Wright brothers became famous. In 1908, Wilbur went to France. He gave demonstration flights at heights of 90 meters. A French company agreed to begin making the Wright brothers' flying machine.

Orville made successful flights in the United States at the time Wilbur was in France. The United States War Department agreed to buy a Wright brothers' plane. Wilbur and Orville suddenly became world heroes. But the brothers were not seeking fame. They returned to Dayton where they continued to improve their airplanes. They taught many others how to fly.

Wilbur Wright died of typhoid fever in 1912. Orville Wright continued designing and inventing until he died many years later, in 1948.

Today, the Wright brothers' first airplane is in the Air and Space Museum in Washington, D.C. Visitors to the museum can look at the Wright brothers' small plane. Then they can walk to another area and see space vehicles and a rock collected from the moon. The world has changed a lot since Wilbur and Orville Wright began the modern age of flight over one hundred years ago.

I'm John Russell.""",
    
    "Methods for Protecting Earth against an Asteroid Strike.json": """Astronomers following asteroid activity in space estimate there is a very small chance an object large enough to destroy a whole city could strike Earth in 2032.

But space agency officials say even if such an asteroid keeps heading on a path toward Earth, the world is now much better-equipped to defend itself against such a threat.

The American space agency NASA recently estimated there was a 3.1 percent chance that asteroid 2024 YR4 would hit Earth on December 22, 2032. That is the highest probability predicted for such a large space rock in modern times.

Richard Moissl is head of the European Space Agency's (ESA) planetary defense office. While recognizing the risk the asteroid could present, he told the French news agency AFP people should not panic over such predictions.

Astronomers have noted that the more data they gather, the odds of a direct asteroid hit are expected to keep rising over time. However, scientists say at a certain point the odds will likely drop down to zero.

Moissl said he thinks it is important to remember that even in the unlikely event the probability keeps rising to 100 percent, the world is "not defenseless."

Here are some methods currently being considered as defensive measures to keep humanity safe in case there is a real threat.

Send a spacecraft to hit it

Only one planetary defense method has been tried against an asteroid. In 2022, NASA's Double Asteroid Redirection Test (DART) sent a spacecraft into the 160-meter-wide Dimorphos asteroid. The effort successfully changed the asteroid's orbit around a larger space rock.

Bruce Betts is chief scientist for the nonprofit Planetary Society. He told AFP that space agencies could hit the 2024 YR4 asteroid with several spacecrafts, observing how each one changed the path.

The asteroid discovered in December is estimated to be 40-90 meters wide -- about half the size of Dimorphos.

"You have to take care not to overdo it," Moissl warned. He said this is because if a spacecraft only partly destroys an asteroid, it could send smaller pieces of the space rock heading toward Earth.

Non-contact methods

A separate idea would involve sending a large spacecraft to fly alongside a threatening asteroid. The spacecraft would not touch the asteroid, but would use its gravitational force to pull it away from Earth.

Moissl said another non-contact plan would put a spacecraft near the asteroid to eject a continuous flow of atoms to push the asteroid off course.

Scientists have also considered painting one side of the asteroid white. They believe this could increase the light the object reflects to make it slowly change course.

Contact methods

One idea is to use a nuclear weapon against a threatening asteroid. In laboratory tests, researchers found that X-rays from a nuclear blast could move a rock. But this is considered more of a plan for kilometers-wide asteroids like the one that killed off the dinosaurs. And this method also carries the risk that a nuclear explosion could send additional pieces of the asteroid falling toward Earth.

A similar method – but one considered less dangerous – would involve shooting laser beams from a spacecraft to destroy the side of an asteroid in an effort to push it away from Earth.

If all else fails

Moissl said that if all else fails, at least the world will have a good idea where a threatening asteroid would strike. Since astronomers believe most asteroids would at most threaten to destroy one city, efforts could be organized to get people out of an area before a strike.

"Seven-and-a-half years is a long time to prepare," Moissl added. He also noted that even with the rising odds involving 2024 YR4, there is still about a 97 percent chance the asteroid will miss Earth.

I'm Jill Robbins.""",
    
    "Total Lunar Eclipse to Turn Moon Red.json": """A total lunar eclipse is about to make the moon appear a reddish color across the Western Hemisphere.

The event will happen Thursday night into Friday morning. The best places to see the eclipse will be in North America and South America. Parts of Africa and Europe may also get brief views.

A lunar eclipse happens when the sun, Earth, and moon line up just right, with Earth positioned between the sun and moon. This causes the Earth to create a shadow on the moon. In a total lunar eclipse, the Earth's shadow covers all of the moon.

Another kind of eclipse is a solar eclipse. In a solar eclipse, the moon gets in a position where it blocks light from the sun, causing a partial or full shadow on Earth.

A total lunar eclipse can also be called a blood moon. It makes the moon appear reddish-orange, similar to the element copper. The color comes from small amounts of sunlight passing through the Earth's atmosphere.

The American space agency NASA says lunar and solar eclipses happen between four and seven times a year. The last total lunar eclipse was in 2022.

This one will be visible for about one hour starting Friday morning at 2:26 a.m. Eastern Daylight Time (EDT). The time when the Earth's shadow covers all of the moon will be close to 3 a.m. EDT.

"As long as the sky is clear, you should be able to see it," Shannon Schmoll told the Associated Press. She is the director of Abrams Planetarium at Michigan State University. No special equipment will be needed to see the reddish moon.

The total lunar eclipse may be harder to see in Europe and Africa because the moon will be close to setting.

Michael Faison is an astronomy expert from Yale University. He told the AP, "This is really an eclipse for North and South America."

Zoe Ortiz is a historian with the University of North Texas. She noted that different civilizations have observed lunar eclipses for thousands of years. This helped ancient people learn things about the behaviors of the sun, moon, and stars.

"They were looking at the night sky and they had a much brighter vision than we do today," Ortiz said.

The ancient Greek thinker and writer Aristotle observed that Earths' shadow on the moon during a lunar eclipse was always curved. This fact supported proof that the Earth is round.

The next total lunar eclipse will appear in the sky September 7, across parts of Asia, Africa, Australia and Europe. Parts of the Americas will get the next chance to see one in March 2026.

I'm Caty Weaver.""",
    
    # Intermediate - As It Is
    "Researchers South Korea's Birth Rate Increase Last Year Unclear.json": """In 2024, the number of babies born in South Korea increased for the first time in nine years. The change is welcome news for a country that is dealing with serious population problems.

South Korea's statistics agency said recently that 238,300 babies were born last year, an increase of 8,300 from a year earlier.

The agency said the country's fertility rate — the average number of babies born to each woman in her reproductive years — was 0.75 in 2024, up from 0.72 in 2023.

The data represents the first time that the yearly number of births has increased since 2015.

Choi Yoon Kyung is an expert with the Korea Institute of Child Care and Education. Choi told the Associated Press that researchers must wait for more data over the next few years to see if increased births were driven by "structural changes."

Park Hyun Jung is with the government agency Statistics Korea. Park said the agency believes the rise is partly due to an increase in marriages following postponements of such plans during the COVID-19 pandemic.

Park said another reason for the increase is that a growing number of people entered their early 30s. She also noted a government study that shows a small increase in the number of young people hoping to have children after marriage.

Official data show South Korea's fertility rate has been the lowest in the developed world in recent years. In 2022, South Korea was the only country with a fertility rate below one, among members of the Paris-based Organization for Economic Cooperation and Development.

The low fertility rate could threaten South Korea's economic health. The country, Asia's fourth largest economy, could face labor shortages and greater spending on public assistance programs. South Korea's central and local governments have been increasingly offering several support programs to those who give birth to children.

But experts say that it will be difficult to solve the country's population problems. Many young people say they do not want to have babies. Their reasons include costly housing, low levels of upward social movement, the high costs of raising and educating children, and a culture that requires women to do more of the childcare.

Park said that the fertility rate will likely stay on an upward movement at least for another year. But observers say it remains to be seen whether the rate will go back down as post-pandemic marriages even out. The country's population structure will also change, with a drop in the number of people in their early 30s.

Some experts argue that the government should pay more attention to supporting young couples who want to have babies.

"There are still people with solid wills to have a family and babies. When we help them realize their hopes, our fertility rate won't suffer a steep, 45-degree drop," Choi said.

I'm John Russell.""",
    
    "Australian Navy Rescues Rower Crossing Pacific from California.json": """A Lithuanian rower attempting to cross the Pacific Ocean has been rescued by an Australian warship after hitting stormy waters off the coast of Queensland state.

Royal Australian Navy officer Justin Jones said in a statement that Aurimas Mockus was brought aboard the warship on March 3.

The 44-year-old adventurer began his trip alone in October from San Diego, California. He made it to within 740 kilometers of Australia's mainland before running into a tropical cyclone.

Australia's Maritime Safety Authority organized the rescue. It said the enclosed boat that Mockus traveled in was mostly destroyed by the powerful waters. He was only able to recover a few personal belongings from the boat.

Adventurer stranded for 3 days by storm

Mockus was stranded for three days in the Coral Sea east of Queensland's coastal city of Mackay. His goal was to make it from California to the Australian state's capital, Brisbane. The whole distance is about 12,000 kilometers.

The rower turned on an emergency signal while experiencing stormy seas fueled by 80-kilometer-per-hour winds caused by Tropical Cyclone Alfred. That led to rescuers establishing radio contact with Mockus. Mockus reported he was "fatigued," the team said.

Navy officials said the warship was taking Mockus to Sydney in New South Wales.

Rowers traveling by themselves have crossed the Pacific Ocean nonstop in the past. Mockus was attempting to become one of the few to cross the sea alone and without stopping.

Peter Bird of Britain became the first to do so in 1983. He rowed from San Francisco and was pulled behind another boat for the last 48 kilometers to the Australian mainland. Even though he did not complete the whole trip alone, he is considered to have rowed close enough to Australia to have made the crossing.

Fellow British citizen John Beeden rowed from San Francisco to the Queensland city of Cairns in 2015. He is considered by some to have made the first successful crossing.

Australian Michelle Lee became the first woman to successfully make the crossing in 2023. She rowed from the Mexican coastal city of Ensenada to Port Douglas in Queensland.

Another Australian, Tom Robinson, attempted to become the youngest to row across the Pacific in 2022. He was 24 years old at the time. During his trip, Robinson took a rest in the Cook Islands. He set out from Peru and spent 265 days at sea before he was rescued off the southwestern Pacific nation of Vanuatu in 2023.

I'm Jill Robbins.""",
    
    "Pearl S. Buck The First American Woman to Win a Nobel Prize in Literature.json": """The year was 1931. The top selling book in the United States was The Good Earth by Pearl S. Buck.

The following year, Buck won the Pulitzer Prize for the best novel by an American writer.

In 1938, Buck became the first American woman to be awarded the Nobel Prize in Literature. She wrote more than one hundred books. She also wrote short stories, poetry, plays, essays, and children's books. But most people remember Pearl Buck for her novels about China. She knew the country and its people very well. For nearly 40 years, China was her home.

Early life

Pearl's parents were Caroline and Absalom Sydenstricker. They were religious workers in China.

Pearl's education began at home. Her mother taught her many of the things she would have learned in an American school. A Chinese teacher taught Pearl other subjects.

In 1910, Pearl went back to the United States to study philosophy at Randolph-Macon Woman's College in Lynchburg, Virginia. After graduation, she returned to China. Three years later, she met John Lossing Buck. He was a religious worker who studied agriculture. They were married and moved to a small village in the north of China. Their life among the poorest people provided the subject matter for many of the books she later wrote.

The Good Earth

The Good Earth is the story of a poor Chinese man named Wang Lung. His wife is O-Lan. They work very hard together and finally make enough money to buy some land for a farm.

After a time, they grow enough crops to feed their family well, with some left over to sell. Their lives get much better, and they are happy. But the good times do not last.

Pearl Buck wrote her first books about China at a time when most people in the world knew almost nothing about the Chinese way of life.

After almost 40 years in China, the writer moved back to the United States. She bought Green Hills Farm in eastern Pennsylvania. She began to write articles for newspapers and magazines. She expressed her opinions on war, politics, religion, equal rights for all people and many other subjects.

She also gave many speeches. Buck talked to young people about the importance of a good education. She also told them they needed to know more about other people around the world.

Pearl Buck died in 1973 at the age of 80.

I'm John Russell."""
}

def update_json_file(filepath, transcript):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Check if fullTranscript already exists
        if 'fullTranscript' in data:
            print(f"  ⚠️  {os.path.basename(filepath)} already has fullTranscript, skipping...")
            return False
        
        data['fullTranscript'] = transcript
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"  ✅ Updated {os.path.basename(filepath)}")
        return True
    except Exception as e:
        print(f"  ❌ Error updating {os.path.basename(filepath)}: {e}")
        return False

def main():
    base_dir = r"c:\Users\ADMIN\Desktop\listening_file"
    
    # Intermediate files
    intermediate_dirs = [
        ("Arts & Culture", ["The Westminster Kennel Club Dog Show, the 'Super Bowl' of Dog Shows.json"]),
        ("Health & Lifestyle", [
            "How Physical Therapists Can Prevent Future Health Problems.json",
            "How Daylight Saving Time Affects Health.json",
            "Rise in ADHD Cases Raises Questions.json",
            "New Flowering Plants for Gardeners to Try.json"
        ]),
        ("Science & Technology", [
            "Wilbur and Orville Wright The First Airplane.json",
            "Methods for Protecting Earth against an Asteroid Strike.json",
            "Total Lunar Eclipse to Turn Moon Red.json"
        ]),
        ("As It Is", [
            "Researchers South Korea's Birth Rate Increase Last Year Unclear.json",
            "Australian Navy Rescues Rower Crossing Pacific from California.json",
            "Pearl S. Buck The First American Woman to Win a Nobel Prize in Literature.json"
        ])
    ]
    
    print("Updating Intermediate files...")
    updated = 0
    for subdir, files in intermediate_dirs:
        for filename in files:
            if filename in transcripts:
                filepath = os.path.join(base_dir, "Intermediate", subdir, filename)
                if os.path.exists(filepath):
                    if update_json_file(filepath, transcripts[filename]):
                        updated += 1
                else:
                    print(f"  ⚠️  File not found: {filepath}")
            else:
                print(f"  ⚠️  No transcript found for: {filename}")
    
    print(f"\n✅ Updated {updated} Intermediate files")
    print("\nNote: Advanced files need to be updated separately with their transcripts.")

if __name__ == "__main__":
    main()

