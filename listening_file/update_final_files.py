# -*- coding: utf-8 -*-
import json
import os
import sys
import glob

# Set UTF-8 encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

transcripts = {
    "Westminster": """At America's 149th Westminster Kennel Club dog show, Monty the giant schnauzer won the top prize.

The lively schnauzer beat six other finalists in New York City to become the first of his breed to win Westminster's "best in show." The prize is the most important and respected in the U.S. dog show world.

While Monty came close to winning Westminster the past two years, he fell short of the big prize. In December 2024, the dog won another big prize, the huge American Kennel Club championship.

But for dog show lovers, Westminster is considered the Super Bowl of all shows. This year the comparison is especially fitting. That is because the most respected U.S. dog competition opened on the same weekend as the Super Bowl -- the most important game in American professional football. This rare happening came after the dates of both competitions changed in recent years.

At Westminster, dogs first compete against other members of their breed. Then, the winner of each breed goes up against other dogs within different competition "groups." Among the groups are sporting, working, toy, and herding. Group winners then compete in the final round.

The best in show winner gets an award – a large, shiny cup called a trophy – and a place in dog-world history. The top prize, however, does not include money.

In her report on the dog show, Learning English's Caty Weaver explains that the Westminster show dates back to 1877. It centers on the traditional purebred judging that leads to the best in show prize. But over the last few years, the organization has added agility and obedience events open to mixed-breed dogs.

In 2024, Sage, a miniature poodle, won best in show at the 148th Westminster Kennel Club dog show.

And in 2023, a petit basset griffon Vendéen, named Buddy Holly, won best in show at Westminster. The breed he represents is known for its rabbit-hunting abilities.

I'm Anna Matteo.""",
    
    "South Korea": """In 2024, the number of babies born in South Korea increased for the first time in nine years. The change is welcome news for a country that is dealing with serious population problems.

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

I'm John Russell."""
}

def main():
    base_dir = r"c:\Users\ADMIN\Desktop\listening_file"
    
    # Find files using glob
    westminster_files = glob.glob(os.path.join(base_dir, "Intermediate", "**", "*Westminster*.json"), recursive=True)
    korea_files = glob.glob(os.path.join(base_dir, "Intermediate", "**", "*South Korea*.json"), recursive=True)
    
    updated = 0
    
    for filepath in westminster_files:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if 'fullTranscript' in data:
                print(f"  [SKIP] {os.path.basename(filepath)}")
                continue
            
            data['fullTranscript'] = transcripts['Westminster']
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"  [OK] {os.path.basename(filepath)}")
            updated += 1
        except Exception as e:
            print(f"  [ERROR] {os.path.basename(filepath)}: {e}")
    
    for filepath in korea_files:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if 'fullTranscript' in data:
                print(f"  [SKIP] {os.path.basename(filepath)}")
                continue
            
            data['fullTranscript'] = transcripts['South Korea']
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"  [OK] {os.path.basename(filepath)}")
            updated += 1
        except Exception as e:
            print(f"  [ERROR] {os.path.basename(filepath)}: {e}")
    
    print(f"\n{'='*50}")
    print(f"Updated: {updated} files")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()

