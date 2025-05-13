import os
import json
import csv
import re

def read_data_file(file_path, sample_rate=None):
    """Read data file with proper handling, without NumPy dependency."""
    try:
        with open(file_path, 'r') as f:
            start_time = float(f.readline().strip())
            if sample_rate is None:
                sample_rate = float(f.readline().strip())
            else:
                # Skip the sample rate line if already provided
                f.readline()
            
            # Read the data values directly, skip using pandas
            values = []
            for line in f:
                line = line.strip()
                if line:  # Skip empty lines
                    try:
                        values.append(float(line))
                    except ValueError:
                        pass  # Skip lines that can't be converted to float
            
            return values, start_time, sample_rate
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return None, None, None

def get_student_grades():
    """Read student grades from the grades file."""
    grades = {}
    current_exam = None
    
    try:
        with open("Project3Data/StudentGrades.txt", 'r', encoding='latin-1', errors='ignore') as f:
            content = f.read()
            
            # Create specific patterns to extract student grades
            midterm1_pattern = r"GRADES - MIDTERM 1.*?-+\s+(.*?)(?=GRADES - MIDTERM 2|\Z)"
            midterm2_pattern = r"GRADES - MIDTERM 2.*?-+\s+(.*?)(?=GRADES - FINAL|\Z)"
            final_pattern = r"GRADES - FINAL.*?-+\s+(.*?)(?=\Z)"
            
            # Extract grades sections
            midterm1_section = re.search(midterm1_pattern, content, re.DOTALL)
            midterm2_section = re.search(midterm2_pattern, content, re.DOTALL)
            final_section = re.search(final_pattern, content, re.DOTALL)
            
            # Helper function to parse grades from a section
            def parse_grades(section, exam_name):
                if not section:
                    return
                    
                lines = section.group(1).strip().split('\n')
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                        
                    # Match pattern like "S01 78" or any variation
                    match = re.search(r'(S\d+)\s*[^\d]*\s*(\d+)', line)
                    if match:
                        student_id = match.group(1)
                        grade = float(match.group(2))
                        
                        if student_id not in grades:
                            grades[student_id] = {}
                            
                        # Normalize Final score to be out of 100 like the midterms
                        if exam_name == "Final":
                            grades[student_id][exam_name] = grade / 2
                        else:
                            grades[student_id][exam_name] = grade
            
            # Parse each section
            parse_grades(midterm1_section, "Midterm 1")
            parse_grades(midterm2_section, "Midterm 2")
            parse_grades(final_section, "Final")
            
    except Exception as e:
        print(f"Error reading grades file: {e}")
    
    print(f"Found grades for {len(grades)} students")
    print("Student grades:", grades)
    return grades

def map_folder_to_student_id(folder_name):
    """Map folder name (S1, S10, etc.) to student ID format in grades (S01, S10)."""
    if folder_name.upper().startswith('S'):
        num_part = folder_name[1:]
        if num_part.isdigit():
            num = int(num_part)
            if num < 10:
                return f"S0{num}"
            else:
                return f"S{num}"
    return folder_name

def calculate_average_for_time_period(values, sample_rate, start_minute, end_minute):
    """Calculate average value for a specific time period."""
    if not values:
        return None
        
    start_idx = int(start_minute * 60 * sample_rate)
    end_idx = int(end_minute * 60 * sample_rate)
    
    # Make sure we don't go out of bounds
    end_idx = min(end_idx, len(values))
    
    if start_idx >= end_idx or start_idx >= len(values):
        return None
    
    # Calculate the mean manually
    subset = values[start_idx:end_idx]
    if not subset:
        return None
    return sum(subset) / len(subset)

def process_data():
    """Process all physiological data and link with grades."""
    data_dir = 'Project3Data/Data'
    student_grades = get_student_grades()
    
    # Map folder names to student IDs for easier reference
    folder_to_id = {
        'S1': 'S01', 'S2': 'S02', 'S3': 'S03', 'S4': 'S04', 'S5': 'S05',
        'S6': 'S06', 'S7': 'S07', 'S8': 'S08', 'S9': 'S09', 'S10': 'S10'
    }
    
    result_data = []
    
    # Get list of student folders
    student_folders = [f for f in os.listdir(data_dir) 
                      if f.startswith('S') and os.path.isdir(os.path.join(data_dir, f))]
    
    print(f"Found {len(student_folders)} student folders")
    
    for student_folder in sorted(student_folders):
        student_path = os.path.join(data_dir, student_folder)
        
        # Map the folder name to the student ID format in the grades
        student_id = folder_to_id.get(student_folder, map_folder_to_student_id(student_folder))
        
        # Skip if we don't have grades for this student
        if student_id not in student_grades:
            print(f"No grades found for {student_id} (folder: {student_folder}), skipping")
            continue
            
        exam_types = ['Midterm 1', 'Midterm 2', 'Final']
        
        for exam_type in exam_types:
            exam_folder = os.path.join(student_path, exam_type)
            
            if not os.path.exists(exam_folder):
                print(f"Exam folder not found: {exam_folder}")
                continue
                
            if exam_type not in student_grades[student_id]:
                print(f"No grade found for {student_id} in {exam_type}")
                continue
                
            print(f"Processing {student_id} - {exam_type}")
                
            # Get exam grade
            grade = student_grades[student_id][exam_type]
            
            # Process each physiological measure
            measures = {
                'HR': os.path.join(exam_folder, 'HR.csv'),
                'EDA': os.path.join(exam_folder, 'EDA.csv'),
                'TEMP': os.path.join(exam_folder, 'TEMP.csv'),
                'BVP': os.path.join(exam_folder, 'BVP.csv')
            }
            
            data_point = {
                'student_id': student_id,
                'exam_type': exam_type,
                'grade': grade
            }
            
            for measure_name, file_path in measures.items():
                if not os.path.exists(file_path):
                    print(f"File not found: {file_path}")
                    continue
                    
                values, start_time, sample_rate = read_data_file(file_path)
                
                if values is None or not values:
                    continue
                
                # Time windows to analyze (first, middle, last third)
                duration = 90 if exam_type != "Final" else 180
                
                if duration == 90:  # 1.5 hours for midterms
                    time_windows = [(0, 30), (30, 60), (60, 90)]
                else:  # 3 hours for final
                    time_windows = [(0, 60), (60, 120), (120, 180)]
                
                # Calculate average for the whole exam
                data_point[f'{measure_name}_avg'] = calculate_average_for_time_period(
                    values, sample_rate, 0, duration
                )
                
                # Calculate averages for different time windows
                for i, (start, end) in enumerate(time_windows):
                    data_point[f'{measure_name}_period{i+1}'] = calculate_average_for_time_period(
                        values, sample_rate, start, end
                    )
            
            if any(key.startswith(('HR_', 'EDA_', 'TEMP_', 'BVP_')) for key in data_point):
                result_data.append(data_point)
    
    # Clean the data - replace None values with NaN for JSON
    for data_point in result_data:
        for key, value in list(data_point.items()):
            if value is None:
                data_point[key] = "NaN"  # Use string "NaN" which D3 can handle
    
    # Save processed data to JSON
    with open('processed_data.json', 'w') as f:
        json.dump(result_data, f)
        
    print(f"Processed data saved: {len(result_data)} data points")

if __name__ == "__main__":
    process_data() 