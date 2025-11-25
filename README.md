A web-app game that allows the player to start a new text based RPG campaign. Inspired by the old-school text based role play games. Where user will read from the description of a situation and will type out the desired actions of their characters. The environment will react, and some event will take place. It combines mechanics from the text based dungeons, and from traditional Dungeons and Dragons. Borrowing the roll based actions, where for each action the user must roll a dice (the size of the dice is correlated to their skill level, like intelligence, strength, agility, scholarship, etc.). The third inspiration is the old-school point-and-click games (like Monkey Island or Full Throttle), user can see a panel where an image is rendered displaying the current environment where their characters are. A Game Master Agent (GMA) analyze every action and reshapes the underlying parameters of the campaign always adjusting it to players decisions providing a live universe that reacts to the player in unique ways. There are no two identical campaigns, every run is a unique experience.

## World Generation

At the beginning of each campaign the player goes through the generation of key elements.

### Genera

- **Fantasy**: your classical fantasy story with magic and elves, a dark evil gaining power, and multiple factions that inhabit a pseudo medieval fantasy world where magic is available to some.
- **Sci-fi**: you classical sci-fi pseudo-dystopian future where corporations have too much power, mankind is trying to adjust to the rapid advancement of technology, and different factions are adopting advance technology at different rates and for different reasons. Spy, detective-noir, trans-humanism, AI, cyborgs, all collide in one cyber-punk world.
- **Slice-of-life**: your everyday story of normal people going about their life, they make friends and enemies, fall in love, struggle with the human condition, and ultimately try to seek balance and harmony in their own life by interacting with their community.
- **Horror**: a disturbing yet intriguing tale where the un-known and forbidden gets manifested, psychological pressure meets darkness that can manifests in evil deeds from normal man, dark creatures and entities that crawl into everyday life for mysterious reasons. Cosmic horrors manifest from a higher dimension to big and ancient for any mortal to comprehend.

### Universe

Player can choose from a pre-made universe already generated for each one of the main genera categories. Or prompt an entire new universe with as much detail as they want. The system will fill in the blanks and generate a well described universe in which the campaign takes place.

Universe main elements:

- **Name of the region**: arbitrary based on the genera
- **Playable locations**: the system will generate mini-dungeons and sub-sections based on this available locations
- **World factions:** the core groups that inhabit the region. they all have different demographics, culture, values, and goals.
- **History**: a short history explaining how the current universe got to be how it is today. It can explain the over all power structures, the hierarchies and key events that took place in order to shape the world that the character inhabits now. This will later be used to generate other interactions and lore connecting events.

### Campaign

Each campaign has some base event’s and character types that play out through the development of the campaign. The system will include them in the appropriate time based on character progression

- **Main conflict**: the whole campaign builds up to a culminating event where user needs to make some decisions, usually supporting one of the exiting factions, or carving it’s own path leading to a concrete unfolding of events that changes the landscape of the universe dramatically. Some factions may completely disappear or get scattered, new factions may arise, a new power dynamic gets instructed, justices gets delivered, or un-justice prevails. (Happy endings are not-mandatory, and are related to players decisions). This may dynamically change depending on character actions and external events.
- **Factions involved**: the main groups that shape the political and geographical aspects of the region. Each with their own goals, value system, and unique capacities, usually controlling certain areas of the region.
- Main Allies: the companions that may join your party and help you in completing the many challenges the main character may face. Each with a unique background story and their own motivations in partnering up with you.
- **Main enemies**: the most powerful characters, that have their own agendas and motivations. Guarantied encounters that will most likely be agains your own goals, unless you dramatically shift alliances.
- **Ultimate boss**: depending on your choices the main boss can change, but it will surely be a powerful enemy that will require more than simple show of strength to overcome. You alliances will come in help, the friends and enemies you made over the campaign may come to assist you or maim your capacity to overcome your enemy.
- **Random events:** uncontrolled random events that re-shape the universe. these may change depending on player decisions, but they may also be pre-suggested at the beginning of the campaign. It could be externalities that non of the factions control (like an accident in a factory triggering a revolt, or the crash of a meteorite that unleash and violent force not aligned with any faction, yet)
- **Campaign ending conditions**: the fulfillment of certain conditions may trigger the early ending of a campaign, like the character dying our of triggering some unwise actions. Or through resolving the main factions conflict in an alternative yet very clever way. This is not bound to happen too early in the campaign, but depending on the shifting of alliances and player actions it may re-wire the ending conditions. This are dynamic parameters that can change over time. Traditionally will be something related to helping your favorite factions in fulfilling their goal, and successfully facing the main boss of the campaign.

### Character

Creates a new character (o selects an existing character). This is done in a traditional DnD style, by rolling a dice and assigning skill points to different skills. Player can prompt with as much detail as wanted the backstory of the character and it’s physical description. The system will fill in the gaps.

**Main Character properties**:

- **Name**: how other characters will refer to them
- **Origin**: Ethnical origin, and region of birth or early childhood.
- **Back Story**: the basic story of how the character got to be what it is today
- **Profession**: the unique abilities the character has based on its work experience
- **Physicality**: the body description of the character. Is it tall and slender, short, chubby, cybernetic eye, wooden leg, blond, etc.

**Skills:**

- **Strength**: physical strength that helps the player navigate the world.
- **Intelligence**: analytical and reasoning abilities that player can use to find alternative ways to solve problems
- **Agility**: fines of movements in interacting with the physical world, it may allow the player to carry out more actions in moment when speed is crucial or when physical interactions are measured in terms of ability.
- **Scholarship**: the level of education that the character has. It allows the player to deeply understand the universe the character inhabits, providing more context for each question the player may about the universe. It may open new dialog and interactions.
- **Intuition**: an extra sensorial ability that will manifest differently depending on the type of universe the character inhabits. It a fantasy world it will grant more magical abilities, in a sci-fi world it will grant greater abilities to use machines and cyber enhancements, in a horror world, it may grant some special senses to navigate the challenges, for a slice-of-life world, the character may have access to better insights, more charisma, or unique opportunities.

## Game Interface

### World Generation Interfaces

- Genera Selection
- Universe Description
- Campaign Generation
- Character Generation

### Main Game Loop Interface

- A text based narration panel that describes the unfolding story, step by step in plain text. Using clear description and poetic narration when appropriate.
- A chat input filed that allows the user to take action that trigger events. (The chat interface can be used for the user to take actions but also to ask more information about the context, clarify previous events, or zoom in and out of the current environment)
- An environment panel visually rendering the current situation. This is a pseudo static image that get’s re-rendered every time that the player takes an action that triggers an event that modifies the environment. (Like opening a treasure chess that was sealed with magic, or triggering a trap that causes an explosion and sets the room on fire). Acts like the visual rendering engine, it can zoom in and renders the portrait of a character when the player is engaging in a conversation with certain character or group of characters.
  - In future versions the image will be also analyzed and segmented by a visual model and we’ll generate an overlay of certain interactive items, so that the user can click on them and perform certain actions related to the item and context.
