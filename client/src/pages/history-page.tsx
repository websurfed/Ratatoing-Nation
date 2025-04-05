import { useState, useEffect } from "react";
import { Loader2, Book as BookIcon, Gavel as GavelIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("constitution");

  // Pattern for cheese background
  const cheesePatternStyle = {
    backgroundImage: "radial-gradient(rgba(255, 199, 44, 0.15) 2px, transparent 2px)",
    backgroundSize: "24px 24px",
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors" style={cheesePatternStyle}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <MobileHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="container mx-auto p-4 md:p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Nation History</h2>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                <TabsTrigger value="constitution">
                  <BookIcon className="h-4 w-4 mr-2" />
                  <span>Constitution</span>
                </TabsTrigger>
                <TabsTrigger value="laws">
                  <GavelIcon className="h-4 w-4 mr-2" />
                  <span>Laws</span>
                </TabsTrigger>
              </TabsList>

              {/* Constitution Tab */}
              <TabsContent value="constitution" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Constitution of the School Nation of Ratatoing</CardTitle>
                    <CardDescription>
                      The supreme law of our sovereign nation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold mb-2">Preamble:</h3>
                      <p className="mb-6">
                        We, the students and citizens of the School Nation of Ratatoing, in pursuit of knowledge, unity, and prosperity, hereby establish this constitution to guide the operations, rights, and duties within our borders. Under the wise and fair leadership of our Supreme Rulers, the Two Bansons, we commit to a future of peace, innovation, and academic excellence. This document serves to protect the sovereignty of Ratatoing and uphold the values that bind us together as a community.
                      </p>

                      <h3 className="text-xl font-bold mb-2">Article I: The Structure of Government</h3>
                      <div className="ml-4">
                        <p className="font-semibold">1. Supreme Rulers – The Two Bansons</p>
                        <ul className="list-disc ml-6 mb-4">
                          <li>The Two Bansons shall serve as the highest authority of Ratatoing, overseeing all governmental functions and decisions.</li>
                          <li>The Two Bansons will make all final decisions regarding the nation's domestic and foreign affairs, including national security, laws, and diplomacy.</li>
                        </ul>

                        <p className="font-semibold">2. The Three Branches of Government</p>
                        <ul className="list-disc ml-6 mb-2">
                          <li>
                            <span className="font-medium">The Guda (Legislative Branch)</span>
                            <ul className="list-[circle] ml-6">
                              <li>The Guda is the legislative body of Ratatoing, responsible for proposing and drafting laws.</li>
                              <li>Members of the Guda can propose laws to the Two Bansons, who will review and approve or reject these proposals.</li>
                              <li>The Guda will be made up of elected citizens who represent the people and are dedicated to ensuring the nation's laws align with the values of Ratatoing.</li>
                            </ul>
                          </li>
                          <li>
                            <span className="font-medium">The Cheddar (Executive Branch)</span>
                            <ul className="list-[circle] ml-6">
                              <li>The Cheddar is the executive branch, responsible for the enforcement and implementation of laws, as well as managing day-to-day affairs in Ratatoing.</li>
                              <li>The Cheddar can propose banning certain citizens to the Two Bansons if they have violated the nation's laws or pose a threat to Ratatoing's security.</li>
                              <li>The Cheddar will be led by officials appointed by the Two Bansons, ensuring that the nation's administrative duties are handled with wisdom and efficiency.</li>
                            </ul>
                          </li>
                          <li>
                            <span className="font-medium">The Munster (Judicial Branch)</span>
                            <ul className="list-[circle] ml-6">
                              <li>The Munster is the judicial branch of Ratatoing, responsible for helping the Two Bansons create new laws and interpret existing laws.</li>
                              <li>The Munster will also be responsible for deciding punishments for citizens who violate the nation's laws. They will ensure that justice is fair and in line with Ratatoing's values.</li>
                              <li>The Munster will consist of a group of legal experts appointed by the Two Bansons, who will advise on legal matters, ensure the integrity of the justice system, and ensure that punishments are appropriate and lawful.</li>
                            </ul>
                          </li>
                        </ul>

                        <p className="font-semibold">3. The Council of Cheese Nibbles</p>
                        <ul className="list-disc ml-6 mb-4">
                          <li>The Council of Cheese Nibbles shall take direct command from the Two Bansons and serve as the primary advisory body to the Supreme Rulers.</li>
                          <li>The Council will be composed of highly skilled individuals, selected by the Bansons, to provide expertise in various fields such as education, culture, and innovation.</li>
                          <li>The Council can propose ideas and policies from normal citizens, which can be emailed or presented to the Two Bansons for approval.</li>
                        </ul>

                        <p className="font-semibold">4. The People's Assembly</p>
                        <ul className="list-disc ml-6 mb-4">
                          <li>The People's Assembly shall consist of local representatives, each elected by citizens to represent their area.</li>
                          <li>All representatives must be approved by the Two Bansons before taking office, ensuring they meet the standards of knowledge, loyalty, and commitment to Ratatoing's values.</li>
                          <li>The assembly's role is to voice the concerns and desires of the citizenry and assist the Bansons in shaping laws and policies, while following the guidance of the Bansons.</li>
                        </ul>
                      </div>

                      <h3 className="text-xl font-bold mb-2">Article II: The Rights of the Citizens</h3>
                      <div className="ml-4">
                        <p className="font-semibold">1. Right to Knowledge</p>
                        <ul className="list-disc ml-6 mb-2">
                          <li>Every citizen has the right to access knowledge, education, and the free exchange of ideas in all academic disciplines.</li>
                        </ul>

                        <p className="font-semibold">2. Right to Citizenship</p>
                        <ul className="list-disc ml-6 mb-2">
                          <li>Any student or individual who abides by the laws of Ratatoing, follows the rules set forth by the Bansons, and is approved by the Two Bansons will be granted citizenship.</li>
                        </ul>

                        <p className="font-semibold">3. Freedom of Expression</p>
                        <ul className="list-disc ml-6 mb-2">
                          <li>Citizens are free to express themselves within the bounds of respect, unity, and academic integrity.</li>
                          <li>Citizens also have the right to email the Two Bansons with any concerns, questions, or suggestions, ensuring that their voices can be heard directly by the Supreme Rulers.</li>
                        </ul>

                        <p className="font-semibold">4. Right to Invitation</p>
                        <ul className="list-disc ml-6 mb-4">
                          <li>Every citizen has the freedom to share, sell, and exchange ideas with one another, fostering creativity and innovation.</li>
                          <li>However, this right does not extend to citizens of Williamstan, who are prohibited from participating in any such exchanges, whether for ideas, products, or services.</li>
                        </ul>
                      </div>

                      <h3 className="text-xl font-bold mb-2">Article III: Foreign Relations</h3>
                      <div className="ml-4">
                        <p className="font-semibold">1. The Sovereignty of Ratatoing</p>
                        <ul className="list-disc ml-6 mb-2">
                          <li>The nation of Ratatoing shall remain sovereign, maintaining full control over its borders, resources, and decisions.</li>
                        </ul>

                        <p className="font-semibold">2. Relationship with Williamstan</p>
                        <ul className="list-disc ml-6 mb-2">
                          <li>The citizens and nation of Williamstan shall be permanently prohibited from entering Ratatoing, except upon explicit approval of the Two Bansons.</li>
                          <li>Any individual or representative from Williamstan attempting to enter Ratatoing without the express approval of the Two Bansons shall be barred entry and considered an adversary.</li>
                        </ul>

                        <p className="font-semibold">3. No Diplomatic Ties with Williamstan</p>
                        <ul className="list-disc ml-6 mb-4">
                          <li>Diplomatic relations with the nation of Williamstan shall remain severed indefinitely. Their citizens, representatives, and officials are not welcome within Ratatoing's borders.</li>
                        </ul>
                      </div>

                      <h3 className="text-xl font-bold mb-2">Article IV: National Security and Enforcement</h3>
                      <div className="ml-4">
                        <p className="font-semibold">1. The Elite Nibbles</p>
                        <ul className="list-disc ml-6 mb-2">
                          <li>The Elite Nibbles, an elite group of highly trained citizens, shall ensure the safety and security of Ratatoing from both internal and external threats.</li>
                          <li>The Elite Nibbles are charged with enforcing the laws set forth by the Two Bansons and the Council of Cheese Nibbles.</li>
                          <li>They will maintain peace and order, protecting the nation from any violations, including the illegal entry of Williamstan citizens or any threats to Ratatoing's sovereignty.</li>
                        </ul>

                        <p className="font-semibold">2. Protection Against Intruders</p>
                        <ul className="list-disc ml-6 mb-4">
                          <li>Any citizen or official found aiding or harboring citizens of Williamstan within Ratatoing's borders will be subject to severe penalties, as determined by the Two Bansons.</li>
                        </ul>
                      </div>

                      <h3 className="text-xl font-bold mb-2">Article V: Amendments and Revisions</h3>
                      <div className="ml-4">
                        <p className="font-semibold">1. Proposal for Amendments</p>
                        <ul className="list-disc ml-6 mb-2">
                          <li>Amendments to this constitution may be proposed by the Two Bansons, the Guda, or the Council of Cheese Nibbles.</li>
                          <li>While citizens may suggest amendments or ideas, only the Bansons have the power to make final changes to the constitution or its amendments.</li>
                        </ul>

                        <p className="font-semibold">2. Final Authority</p>
                        <ul className="list-disc ml-6 mb-4">
                          <li>The Two Bansons hold the ultimate authority to revise or change this constitution, ensuring that it adapts to the ever-evolving needs of Ratatoing.</li>
                        </ul>
                      </div>

                      <h3 className="text-xl font-bold mb-2">Article VI: The Supreme Rulers</h3>
                      <div className="ml-4">
                        <p className="font-semibold">1. The Role of the Two Bansons</p>
                        <ul className="list-disc ml-6 mb-2">
                          <li>The Two Bansons hold supreme authority in Ratatoing, and their decisions are final in all matters. Their wisdom and judgment are essential to the continued success and peace of the nation.</li>
                        </ul>

                        <p className="font-semibold">2. Approval of Entry and Foreign Affairs</p>
                        <ul className="list-disc ml-6 mb-4">
                          <li>All decisions regarding foreign relations, including whether individuals or nations may enter Ratatoing, rest solely in the hands of the Two Bansons.</li>
                        </ul>
                      </div>

                      <div className="mt-8 border-t pt-4">
                        <p className="font-bold">Signed and Enacted by the Supreme Rulers, The Two Bansons, on this day of Ratatoing's founding.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Laws Tab */}
              <TabsContent value="laws" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Laws of the School Nation of Ratatoing</CardTitle>
                    <CardDescription>
                      To Ensure Security and Peace
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <p className="mb-6">
                      To maintain peace, uphold the values of Ratatoing, and protect the well-being and integrity of our nation, 
                      the following laws are enacted under the guidance of the Two Bansons:
                    </p>

                    {/* Law 1 */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold">Law 1: The Protection of Sovereignty and Borders</h3>
                      <p className="font-medium">Purpose:</p>
                      <p>To safeguard Ratatoing's sovereignty and prevent unauthorized entry by foreign citizens, especially those from Williamstan.</p>
                      <p className="font-medium">Provisions:</p>
                      <ul className="list-disc ml-6 space-y-1">
                        <li>All citizens and visitors must have explicit approval from the Two Bansons to enter Ratatoing.</li>
                        <li>Any individual found attempting to enter Ratatoing without proper authorization will be detained and sent back immediately. Repeat offenders will be permanently banned from entry.</li>
                        <li>The Elite Nibbles shall monitor and patrol Ratatoing's borders to prevent any unlawful entry.</li>
                        <li>No inappropriate content or words will be tolerated in any communication related to border security. Any violations will result in swift penalties.</li>
                      </ul>
                    </div>

                    {/* Law 2 */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold">Law 2: The Non-Aggression Pact</h3>
                      <p className="font-medium">Purpose:</p>
                      <p>To ensure peaceful relations within Ratatoing and prevent internal conflict or the promotion of violence.</p>
                      <p className="font-medium">Provisions:</p>
                      <ul className="list-disc ml-6 space-y-1">
                        <li>Any act of aggression, including bullying, violence, or sabotage, within Ratatoing's borders will result in immediate investigation by the Munster judicial branch.</li>
                        <li>Punishments for violent acts can range from suspension of citizenship to expulsion from the nation, depending on the severity of the offense.</li>
                        <li>The Elite Nibbles will investigate any threats to peace, both physical and intellectual, and act swiftly to contain them.</li>
                        <li>No inappropriate content or words will be tolerated in any form of aggression or communication. Those engaging in such behavior will be subject to immediate penalties.</li>
                      </ul>
                    </div>

                    {/* Law 3 */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold">Law 3: The Law of Loyalty and Conduct</h3>
                      <p className="font-medium">Purpose:</p>
                      <p>To ensure that citizens remain loyal to the values and objectives of Ratatoing and adhere to national laws.</p>
                      <p className="font-medium">Provisions:</p>
                      <ul className="list-disc ml-6 space-y-1">
                        <li>All citizens of Ratatoing must uphold the values of knowledge, creativity, unity, and peace.</li>
                        <li>Any citizen found promoting or supporting the interests of Williamstan will be deemed a traitor to the nation and will be subject to immediate investigation by the Cheddar branch.</li>
                        <li>Traitors will face penalties such as removal of citizenship, public trial, and possible exile.</li>
                        <li>No inappropriate content or words will be tolerated in the promotion of disloyalty or treasonous activities. Offenders will be punished accordingly.</li>
                      </ul>
                    </div>

                    {/* Law 4 */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold">Law 4: The Non-Interference Law</h3>
                      <p className="font-medium">Purpose:</p>
                      <p>To maintain the integrity of Ratatoing and prevent foreign interference from nations such as Williamstan.</p>
                      <p className="font-medium">Provisions:</p>
                      <ul className="list-disc ml-6 space-y-1">
                        <li>No citizen of Ratatoing may engage in political, economic, or social cooperation with citizens or governments of Williamstan without explicit permission from the Two Bansons.</li>
                        <li>Any attempts to establish relationships, trade, or diplomatic contacts with Williamstan will be deemed illegal and will be punished accordingly.</li>
                        <li>The Elite Nibbles will monitor any unauthorized attempts at communication or trade with Williamstan, taking swift action to neutralize these efforts.</li>
                        <li>No inappropriate content or words will be tolerated in any form of communication or actions that violate this law. Violators will be subject to penalties.</li>
                      </ul>
                    </div>

                    {/* Law 5 */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold">Law 5: The Innovation and Knowledge Protection Act</h3>
                      <p className="font-medium">Purpose:</p>
                      <p>To safeguard the creative ideas and innovations of Ratatoing's citizens, ensuring that intellectual property remains within the nation.</p>
                      <p className="font-medium">Provisions:</p>
                      <ul className="list-disc ml-6 space-y-1">
                        <li>Citizens are free to share and sell ideas with one another, fostering innovation and intellectual exchange, as long as these ideas do not leave Ratatoing or go to Williamstan.</li>
                        <li>Any citizen found illegally sharing Ratatoing's intellectual property with citizens of Williamstan or other foreign entities will face charges of treason.</li>
                        <li>The Guda shall propose new laws to protect intellectual property and ensure that Ratatoing's citizens benefit from their own innovations.</li>
                        <li>No inappropriate content or words will be tolerated in any exchanges of ideas, and the Elite Nibbles will act swiftly against any violation.</li>
                      </ul>
                    </div>

                    {/* Law 6 */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold">Law 6: The Law of Public Safety and National Security</h3>
                      <p className="font-medium">Purpose:</p>
                      <p>To maintain peace and protect Ratatoing from internal and external threats.</p>
                      <p className="font-medium">Provisions:</p>
                      <ul className="list-disc ml-6 space-y-1">
                        <li>The Elite Nibbles will be responsible for maintaining law and order in Ratatoing, especially during public events, protests, or any situation that may disrupt peace.</li>
                        <li>Any citizen or group found causing chaos, spreading panic, or endangering public safety will be arrested and tried by the Munster judicial branch.</li>
                        <li>Citizens must cooperate with the Elite Nibbles during security operations or when asked to provide information regarding potential threats to national security.</li>
                        <li>No inappropriate content or words will be tolerated in any communications or actions that threaten national safety. Offenders will face serious consequences.</li>
                      </ul>
                    </div>

                    {/* Law 7 */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold">Law 7: The Citizenship Accountability Act</h3>
                      <p className="font-medium">Purpose:</p>
                      <p>To ensure that citizens act in accordance with the laws and rules of Ratatoing, ensuring that only those who respect the nation's values are granted citizenship.</p>
                      <p className="font-medium">Provisions:</p>
                      <ul className="list-disc ml-6 space-y-1">
                        <li>All individuals who wish to become citizens of Ratatoing must demonstrate their loyalty to the nation, respect its laws, and adhere to its values.</li>
                        <li>Any citizen who breaks the law or undermines the nation's goals will be subject to the penalties determined by the Munster judicial branch.</li>
                        <li>Non-citizens found residing within Ratatoing without approval from the Two Bansons will be expelled, and repeat offenders will face permanent banishment.</li>
                        <li>No inappropriate content or words will be tolerated from any citizen, and failure to respect Ratatoing's values will result in loss of citizenship.</li>
                      </ul>
                    </div>

                    {/* Law 8 */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold">Law 8: The Peaceful Assembly Act</h3>
                      <p className="font-medium">Purpose:</p>
                      <p>To ensure that citizens may assemble peacefully, without disrupting national peace or security.</p>
                      <p className="font-medium">Provisions:</p>
                      <ul className="list-disc ml-6 space-y-1">
                        <li>Citizens are allowed to assemble and express their concerns as long as it does not cause harm to public order or security.</li>
                        <li>All public gatherings must be registered with the Cheddar branch before they occur, and a representative of the Elite Nibbles must be present to ensure the safety of the event.</li>
                        <li>If a gathering turns violent or unlawful, the Elite Nibbles have the authority to disband the assembly and arrest those responsible for any disruption.</li>
                        <li>No inappropriate content or words will be tolerated during any public assembly. Offensive language or violent rhetoric will result in the immediate termination of the assembly and penalties for those responsible.</li>
                      </ul>
                    </div>

                    {/* Law 9 */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold">Law 9: The Law of Social Media and Communication</h3>
                      <p className="font-medium">Purpose:</p>
                      <p>To regulate communication within Ratatoing and prevent the spread of harmful or subversive content.</p>
                      <p className="font-medium">Provisions:</p>
                      <ul className="list-disc ml-6 space-y-1">
                        <li>All citizens may freely use social media platforms and communication tools to express their ideas, as long as they do not promote violence, disrupt national unity, or spread harmful content about Ratatoing or its leadership.</li>
                        <li>Any individual or group found spreading false information or harmful content that endangers the peace and security of Ratatoing will be subject to investigation by the Cheddar branch.</li>
                        <li>The Elite Nibbles will work with digital surveillance to track any threats in cyberspace and ensure the safety of citizens from external harm.</li>
                        <li>No inappropriate content or words will be tolerated in any digital space. Violations will lead to penalties, including temporary suspension from communication channels or citizenship revocation.</li>
                      </ul>
                    </div>

                    {/* Law 10 */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold">Law 10: The National Loyalty Oath</h3>
                      <p className="font-medium">Purpose:</p>
                      <p>To ensure that every citizen remains loyal to the principles of Ratatoing and its leadership.</p>
                      <p className="font-medium">Provisions:</p>
                      <ul className="list-disc ml-6 space-y-1">
                        <li>Every citizen must take an oath of loyalty upon gaining citizenship, pledging to uphold the values of Ratatoing, follow its laws, and protect its sovereignty.</li>
                        <li>Citizens who refuse to take the oath or show signs of disloyalty will be placed under review by the Munster branch and could face exile or loss of citizenship.</li>
                        <li>The Cheddar branch will be responsible for enforcing this law during the citizenship process.</li>
                        <li>No inappropriate content or words will be tolerated from anyone taking the loyalty oath. All citizens must demonstrate a commitment to respectful communication and behavior.</li>
                      </ul>
                    </div>

                    {/* Law 11 */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold">Law 11: The Code of Respect and Decency</h3>
                      <p className="font-medium">Purpose:</p>
                      <p>To ensure that all communication, behavior, and content within Ratatoing remain respectful, appropriate, and aligned with the nation's values of peace, unity, and academic integrity.</p>
                      <p className="font-medium">Provisions:</p>
                      <ul className="list-disc ml-6 space-y-1">
                        <li>Any form of inappropriate content—including offensive language, discriminatory remarks, or content that is harmful or disrespectful to others—will not be tolerated in Ratatoing.</li>
                        <li>Citizens found using inappropriate words, engaging in harmful online behavior, or promoting content that violates the values of Ratatoing will face penalties ranging from warnings to expulsion, depending on the severity of the offense.</li>
                        <li>The Munster judicial branch will review any allegations of inappropriate content and determine appropriate consequences for offenders.</li>
                        <li>All public platforms, including social media and communication channels, are to be monitored to ensure that they adhere to the standards of respect and decency.</li>
                        <li>The Elite Nibbles will enforce this law, ensuring that any harmful content is swiftly addressed and that Ratatoing's reputation as a respectful and safe nation is upheld.</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}