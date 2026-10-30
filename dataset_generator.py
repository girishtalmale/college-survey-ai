import pandas as pd
import numpy as np
import random
import json
import os

def generate_survey_dataset(num_samples=1800, output_path="college_survey_corpus.csv"):
    np.random.seed(42)
    random.seed(42)
    
    facilities = [
        "Faculties",
        "College Infrastructure",
        "Library Facilities",
        "Labs Infrastructure",
        "Placements",
        "Internship",
        "Extracurricular Activities",
        "Industry Connect",
        "International Collaboration"
    ]
    
    departments = [
        "Computer Science & Engineering",
        "Electronics & Communication",
        "Mechanical Engineering",
        "Civil Engineering",
        "Information Technology",
        "Electrical Engineering"
    ]
    
    academic_years = ["1st Year", "2nd Year", "3rd Year", "4th Year"]
    
    # Templates for feedback generator per sentiment category
    feedback_templates = {
        "Faculties": {
            "Positive": [
                "The professors are extremely helpful, clear in explanation, and approachable after class.",
                "Faculty members use modern teaching methodologies and conduct great doubt solving sessions.",
                "Our department faculty has excellent domain expertise and guides us well in research.",
                "Highly inspiring teachers who make even complex subjects easy to understand.",
                "Professors are dedicated and provide timely guidance for projects and assignments."
            ],
            "Neutral": [
                "Faculty coverage of syllabus is adequate, though some lectures feel a bit rushed.",
                "Teaching quality varies depending on the subject, overall average experience.",
                "Professors follow the textbook closely. Lectures are informative but standard.",
                "Teachers are accessible during office hours, though response time to emails varies.",
                "Classroom delivery is fine, but more practical examples would improve understanding."
            ],
            "Negative": [
                "Few professors rely solely on slides and lack interactive engagement during lectures.",
                "Faculty availability outside class hours is very limited and doubts remain unresolved.",
                "Teaching pace is too fast and explanations are difficult to follow for average students.",
                "Some faculty members do not provide clear grading feedback on assignments.",
                "Lack of updated teaching material from certain department professors."
            ]
        },
        "College Infrastructure": {
            "Positive": [
                "Campus infrastructure is top notch with modern high-speed Wi-Fi and green clean environment.",
                "Classrooms are spacious, well-ventilated, equipped with smart projectors and comfortable seating.",
                "Excellent canteen hygiene, clean restrooms, and well-maintained hostel buildings.",
                "The campus security and overall infrastructure support modern student life perfectly.",
                "Great sports grounds, auditorium, and campus connectivity."
            ],
            "Neutral": [
                "Infrastructure is basic but functional. Wi-Fi works decently in most areas.",
                "Classrooms are satisfactory, though air conditioning in auditorium needs maintenance.",
                "Canteen food quality is okay, but seating capacity during lunch hours is tight.",
                "Campus grounds are good, though parking facilities could be expanded.",
                "Building maintenance is routine, but elevator service is sometimes slow."
            ],
            "Negative": [
                "Wi-Fi connectivity is frequent dropping across hostels and academic blocks.",
                "Classroom furniture is damaged in several lecture halls and projectors fail often.",
                "Washroom cleanliness is poor and hygiene standard needs immediate improvement.",
                "Canteen food options are unhygienic and overpriced.",
                "Insufficient drinking water coolers and poor maintenance in sports facilities."
            ]
        },
        "Library Facilities": {
            "Positive": [
                "Library has a huge collection of IEEE journals, reference books, and quiet digital reading zones.",
                "Online library portal allows seamless access to research papers and standard e-books.",
                "Staff is cooperative, borrowing process is smooth, and study cubicles are peaceful.",
                "State of the art library infrastructure with 24/7 access during exam sessions.",
                "Excellent digital library section with high speed desktop access for paper reading."
            ],
            "Neutral": [
                "Library collection is decent, though newest editions of technical books are limited.",
                "Study atmosphere is good, but seating fills up quickly during exam periods.",
                "Library timing is sufficient for daily study, though weekend hours could be extended.",
                "Book issuance process is standard, though fine rules are somewhat strict.",
                "E-library access is working, but user interface of search catalog needs update."
            ],
            "Negative": [
                "Many core department textbooks are out of stock or out of print in the library.",
                "Library noise levels are not properly regulated by staff during study hours.",
                "Computers in the digital library section are outdated and slow.",
                "Strict short borrowing duration makes it hard to complete reference reading.",
                "Air conditioning and seating capacity in central library are inadequate."
            ]
        },
        "Labs Infrastructure": {
            "Positive": [
                "Labs are equipped with latest high-performance workstations, modern oscilloscopes, and tools.",
                "Hands-on lab experiments give practical skills directly relevant to industry standards.",
                "Lab assistants are knowledgeable and assist well during practical implementations.",
                "Software tools and licenses are fully updated across all computer laboratories.",
                "Well maintained equipment and safe environment across all engineering labs."
            ],
            "Neutral": [
                "Lab hardware is adequate for basic curriculum experiments.",
                "Some computer labs have updated PCs while others have older hardware setups.",
                "Lab manuals are structured fine, though more open-ended experiments would help.",
                "Software tools are available, though server speed can be sluggish during peak hours.",
                "Lab timings are fixed and extra practical hours require prior approvals."
            ],
            "Negative": [
                "Multiple lab devices and instruments are broken or non-functional during practicals.",
                "Outdated computer hardware with insufficient RAM causes regular system freezes.",
                "Lab assistants are unhelpful and fail to troubleshoot hardware errors during exams.",
                "Lack of updated software licenses for specialized departmental simulation software.",
                "Lab batch size is too large leading to 4-5 students sharing a single equipment setup."
            ]
        },
        "Placements": {
            "Positive": [
                "Training and Placement Cell works relentlessly, bringing top Tier-1 tech companies.",
                "Outstanding placement drive with great average CTC package offers for our department.",
                "Placement cell conducts rigorous mock interviews, aptitude training, and soft skills workshops.",
                "Excellent placement record with diverse roles across product and core engineering domains.",
                "Company tie-ups are strong and campus recruitment support is outstanding."
            ],
            "Neutral": [
                "Placements are decent for software roles, though core company visits are moderate.",
                "Average package is reasonable, but placement criteria rules could be more flexible.",
                "Mock test sessions were conducted, though specialized domain training was limited.",
                "Placement drive timeline was satisfactory, but communication regarding interview slots had delays.",
                "Good opportunities for top coders, average opportunities for general applicants."
            ],
            "Negative": [
                "Placement cell favors selected branches and neglect non-IT department candidates.",
                "Very few tier-1 companies visited campus this year compared to previous batches.",
                "Lack of aptitude and technical interview preparation assistance from placement cell.",
                "Placement transparency is low and shortlisting criteria remain unclear.",
                "Low salary packages offered with rigid bond conditions from visiting companies."
            ]
        },
        "Internship": {
            "Positive": [
                "College provides dedicated internship opportunities with reputed industry partners and stipends.",
                "Summer internship assistance and NOC approval process is completely streamlined.",
                "Great industry sponsored internship projects that converted into full time offers.",
                "Faculty mentors actively connect students with alumni for research internships.",
                "Strong industrial exposure with flexible attendance policies for internship work."
            ],
            "Neutral": [
                "Internship portal lists opportunities, but most require self-application.",
                "NOC clearance process takes 3-4 days but eventually gets completed without hassle.",
                "Stipend opportunities are limited, but learning experience in assigned companies is okay.",
                "College permits off-campus internships provided academic attendance requirements are met.",
                "Internship guidance is available if requested, but mandatory support is minimal."
            ],
            "Negative": [
                "College provides almost zero assistance for securing mandatory core internships.",
                "Bureaucratic delay in granting NOC letters for selected internship candidates.",
                "Unpaid internship listings dominated the college career portal with low learning value.",
                "Strict attendance rules restrict students from taking up full-term industry internships.",
                "Lack of proper evaluation and credit transfer policy for summer industrial internships."
            ]
        },
        "Extracurricular Activities": {
            "Positive": [
                "Vibrant campus life with active technical clubs, cultural fests, and sports tournaments.",
                "College provides generous funding and support for student hackathons and robotics teams.",
                "Extracurricular clubs foster leadership, creativity, and interdisciplinary collaboration.",
                "Annual college fest is grand with famous guest performers and enthusiastic participation.",
                "Great support for national level sports competitions and student initiatives."
            ],
            "Neutral": [
                "Clubs are active, though events usually happen after academic class hours.",
                "Cultural fest is organized decently, but budget constraints limit scale.",
                "Sports facilities are available for casual games, though professional coaching is lacking.",
                "Participation certificates are issued, but academic credit integration is absent.",
                "Technical clubs hold workshops occasionally with average student turnout."
            ],
            "Negative": [
                "Academic workload leaves virtually no time for participating in extracurricular activities.",
                "College administration continuously denies permissions and budget for student club events.",
                "Sports equipment is poorly maintained and ground availability is restricted.",
                "Lack of encouragement or attendance relief for students representing college in hackathons.",
                "Technical clubs are inactive and lack faculty guidance or dedicated club rooms."
            ]
        },
        "Industry Connect": {
            "Positive": [
                "Regular guest lectures by industry leaders, CTOs, and technical domain experts.",
                "Strong industrial visit programs to manufacturing plants and IT innovation hubs.",
                "Curriculum is aligned with industry trends like AI, Cloud, and IoT through partner workshops.",
                "Industry MoU partnerships provide direct exposure to real enterprise projects.",
                "Co-designed industry courses give students a strong competitive edge in job market."
            ],
            "Neutral": [
                "Guest lectures happen 2-3 times a semester, topics are informative.",
                "Industry visits are organized once a year, giving basic overview of working environment.",
                "Some elective courses have industry experts, though majority follow standard academic syllabus.",
                "Industry connect cell exists, but active student engagement programs are periodic.",
                "Seminars provide high-level overview without deep practical workshop sessions."
            ],
            "Negative": [
                "Huge disconnect between current college curriculum and actual technology industry demands.",
                "Zero industrial visits organized for our department throughout the academic year.",
                "Promised industry partner certification workshops never materialized.",
                "Guest lectures are theoretical and disconnected from current engineering tools.",
                "Lack of corporate interaction or industry mentor mentorship for final year projects."
            ]
        },
        "International Collaboration": {
            "Positive": [
                "Excellent student exchange programs with prestigious overseas partner universities.",
                "Foreign faculty guest lectures and collaborative joint research publications.",
                "Dual degree options and international summer research fellowship guidance available.",
                "Active international exposure with study abroad counseling cell.",
                "Global symposiums organized on campus with international delegates."
            ],
            "Neutral": [
                "International cell provides information, but exchange program costs are high.",
                "Few MoU agreements exist with foreign institutes, though student exchange seats are limited.",
                "Virtual international webinars take place occasionally for interested students.",
                "Credit transfer guidelines for overseas summer programs are documented but lengthy.",
                "International student opportunities exist primarily for top academic rankers."
            ],
            "Negative": [
                "No active international collaboration or student exchange programs in our department.",
                "College website advertises global tie-ups but zero students received exchange offers.",
                "Lack of guidance and financial scholarship support for overseas research conferences.",
                "Bureaucratic hurdles make credit transfer from international programs practically impossible.",
                "International collaboration cell is unresponsive and inactive."
            ]
        }
    }

    sentiments = ["Positive", "Neutral", "Negative"]
    sentiment_weights = [0.45, 0.30, 0.25]  # realistic college distribution
    
    rows = []
    
    for i in range(1, num_samples + 1):
        student_id = f"STU{i:04d}"
        dept = random.choice(departments)
        year = random.choice(academic_years)
        facility = random.choice(facilities)
        sentiment = np.random.choice(sentiments, p=sentiment_weights)
        
        # Rating score based on sentiment
        if sentiment == "Positive":
            rating = random.choice([4, 5])
        elif sentiment == "Neutral":
            rating = 3
        else:
            rating = random.choice([1, 2])
            
        # Select feedback text template with slight variations
        base_text = random.choice(feedback_templates[facility][sentiment])
        
        # Add slight natural variation prefix/suffix
        prefixes = ["Overall, ", "In my opinion, ", "Regarding this facility, ", "As a student, ", "I feel that "]
        use_prefix = random.random() > 0.6
        review_text = (random.choice(prefixes) if use_prefix else "") + base_text
        
        rows.append({
            "student_id": student_id,
            "department": dept,
            "academic_year": year,
            "facility": facility,
            "rating": rating,
            "review_text": review_text,
            "sentiment": sentiment
        })
        
    df = pd.DataFrame(rows)
    df.to_csv(output_path, index=False)
    print(f"Dataset generated successfully at '{output_path}' with {len(df)} survey entries.")
    return df

if __name__ == "__main__":
    generate_survey_dataset(1800, "college_survey_corpus.csv")
