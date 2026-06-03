import joblib

# Bu script final model notebook'unda çalıştırılmalı.
# X_final_train ve label_names değişkenleri notebook'ta hazır olduktan sonra çalıştır.

results_path = "/content/drive/MyDrive/Bitirme/final_test_results/"

joblib.dump(list(X_final_train.columns), results_path + "feature_columns.pkl")
joblib.dump(label_names, results_path + "label_names.pkl")

print("feature_columns.pkl ve label_names.pkl kaydedildi.")
