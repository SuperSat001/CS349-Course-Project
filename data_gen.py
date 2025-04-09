with open("public/sample_data.sql", "w") as f:
    f.write("BEGIN;\n")
    f.write("INSERT INTO my_table (id, name) VALUES\n")
    for i in range(1, 11):
        line = f"  ({i}, 'Name_{i}')"
        line += "," if i < 1000 else ";\n"
        f.write(line + "\n")
    f.write("COMMIT;\n")
