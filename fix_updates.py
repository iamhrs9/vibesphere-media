import os
import glob

public_dir = '/Users/harshpanwar/Codes/vibesphere-media/public'

# 1. Update Terms & Conditions
terms_file = os.path.join(public_dir, 'terms&conditions.html')
if os.path.exists(terms_file):
    with open(terms_file, 'r') as f:
        content = f.read()
    
    line_to_remove = 'All disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts in and .'
    if line_to_remove in content:
        content = content.replace(line_to_remove, '')
        with open(terms_file, 'w') as f:
            f.write(content)
        print("Updated terms&conditions.html")

# 2. Hide Blog Pages
html_files = glob.glob(os.path.join(public_dir, '*.html'))
for file in html_files:
    with open(file, 'r') as f:
        content = f.read()
        
    original = content
    # Replace navbar blog link
    content = content.replace('<li><a href="/blog.html">Blog</a></li>', '<!-- <li><a href="/blog.html">Blog</a></li> -->')
    content = content.replace('<li><a href="/blog.html" class="active">Blog</a></li>', '<!-- <li><a href="/blog.html" class="active">Blog</a></li> -->')
    
    # Replace footer blog link
    content = content.replace('<a href="/blog" style="color: #555; text-decoration: none; font-weight: 500; transition: 0.3s;">Blog</a>', '<!-- <a href="/blog" style="color: #555; text-decoration: none; font-weight: 500; transition: 0.3s;">Blog</a> -->')
    
    # Replace the one with a newline and style inside
    to_replace_multiline = '''<a href="/blog"
                style="color: #555; text-decoration: none; font-weight: 500; transition: 0.3s;">Blog</a>'''
    if to_replace_multiline in content:
        content = content.replace(to_replace_multiline, '<!-- ' + to_replace_multiline + ' -->')
    
    # And another variant from read-blog.html
    to_replace_multiline2 = '''<a href="/blog"
                style="color: #555; text-decoration: none; font-weight: 500; transition: 0.3s;">Blog</a>'''
                
    if content != original:
        with open(file, 'w') as f:
            f.write(content)
        print(f"Updated {os.path.basename(file)}")

print("Done!")
