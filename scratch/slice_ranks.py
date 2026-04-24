from PIL import Image
import os

def slice_ranks():
    img_path = 'public/ui/ranks/ranks_master.png'
    output_dir = 'public/ui/ranks'
    
    if not os.path.exists(img_path):
        print(f"Error: {img_path} not found.")
        return

    img = Image.open(img_path)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
        
    width, height = img.size
    cols = 4
    rows = 3
    
    cell_w = width // cols
    cell_h = height // rows
    
    tiers = ['bronze', 'silver', 'gold', 'platinum']
    sub_ranks = ['rival', 'hero', 'legend']
    
    for r in range(rows):
        for c in range(cols):
            tier_name = tiers[c]
            rank_name = sub_ranks[r]
            
            # Define box
            left = c * cell_w
            top = r * cell_h
            right = (c + 1) * cell_w
            bottom = (r + 1) * cell_h
            
            # Crop the cell
            cell = img.crop((left, top, right, bottom))
            
            # ENABLE TIGHT CROP: Remove transparent padding
            bbox = cell.getbbox()
            if bbox:
                cell = cell.crop(bbox)
            
            output_path = os.path.join(output_dir, f"{tier_name}_{rank_name}.png")
            cell.save(output_path, "PNG")
            print(f"Saved (Tight Crop): {output_path}")

if __name__ == "__main__":
    slice_ranks()
